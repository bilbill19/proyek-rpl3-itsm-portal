/**
 * ============================================================================
 * POST /api/ai/chat  ->  AI Chatbot NVIDIA (Chatbot Beranda)
 * ============================================================================
 *
 * Alur:
 *   Chatbot Component (client) -> Route Handler ini (server) -> Shared AI
 *   Service (`@/lib/ai`) -> NVIDIA NIM (`integrate.api.nvidia.com`) -> reply.
 *
 * SECURITY:
 *   - API key NVIDIA hanya dibaca `@/lib/ai/nvidia` di sisi server.
 *   - Route ini TIDAK PERNAH mengembalikan API key / provider secret apa pun.
 *   - Input divalidasi dengan zod dan dibatasi panjangnya.
 *   - Ada rate limit sederhana per IP.
 *
 * Route ini sengaja public (tanpa login) karena Beranda dapat diakses tamu,
 * sehingga tetap dilindungi rate limit + validasi input di bawah ini.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateNvidiaChatResponse, type AIGenerationContext } from '@/lib/ai';
import { buildScopeRefusal, classifyScope } from '@/lib/ai/scope';
import { formatCatalogBlock, getPublicCatalog, getPublicChatPrivacyReply, getPublicIdentityGuardReply } from '@/lib/customer-context';
import { isAskingAboutDeveloper, getDeveloperIdentityResponse } from '@/lib/developer';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (default Next.js App Router memang nodejs; dideklarasikan
// agar terbukti di kode): route handler chatbot TIDAK berjalan di Edge Runtime —
// dibutuhkan untuk Prisma/PostgreSQL, fs, dan kripto Node.
export const runtime = 'nodejs';

/** Panjang maksimal satu pesan (karakter). */
const MAX_MESSAGE_LENGTH = 2000;
/** Jumlah riwayat pesan yang diterima untuk konteks percakapan. */
const MAX_HISTORY = 10;
/** Rate limit: maksimum request per IP dalam 1 menit. */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;

const historyItemSchema = z.object({
  role: z.enum(['USER', 'ASSISTANT']),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong.').max(MAX_MESSAGE_LENGTH, {
    message: `Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`,
  }),
  history: z.array(historyItemSchema).max(MAX_HISTORY).default([]),
});

/**
 * Rate limiter in-memory (sliding window sederhana).
 * Cukup untuk melindungi endpoint publik dari spam tanpa dependensi eksternal.
 */
const requestLog = new Map<string, { count: number; resetAt: number }>();

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(ip);

  if (!entry || entry.resetAt <= now) {
    // Bersihkan entri kedaluwarsa agar map tidak membengkak.
    if (requestLog.size > 1000) {
      requestLog.forEach((value, key) => {
        if (value.resetAt <= now) requestLog.delete(key);
      });
    }
    requestLog.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!allowRequest(ip)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan tunggu sebentar lalu coba lagi.' },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Format permintaan tidak valid.' },
        { status: 400 }
      );
    }

    // Normalisasi riwayat SEBELUM validasi: balasan asisten buatan provider AI
    // bisa melebihi 2000 karakter; potong tepat di batas yang sama agar follow-up
    // tidak ditolak 400. BATAS TETAP BERLAKU (payload tak pernah diterima > 2000);
    // pesan USER tetap divalidasi ketat oleh skema (tidak di-clamp).
    if (Array.isArray(body.history)) {
      body.history = body.history.map((h: { role?: unknown; content?: unknown }) =>
        h && typeof h.content === 'string' && h.content.length > MAX_MESSAGE_LENGTH
          ? { role: h.role, content: String(h.content).slice(0, MAX_MESSAGE_LENGTH) }
          : h
      );
    }

    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: first?.message || 'Input tidak valid.' },
        { status: 400 }
      );
    }

    const { message, history } = parsed.data;
    const userMessage = message.trim();

    if (userMessage.length === 0) {
      return NextResponse.json(
        { error: 'Pesan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // 1) Identitas pengembang resmi — informasi PUBLIK yang dijawab
    //    deterministik dari satu sumber konfigurasi. Dicek SEBELUM scope gate
    //    karena pertanyaan "siapa yang membuat website ini?" bisa terdeteksi
    //    classifier sebagai creation intent (verb "buat" + objek "website").
    if (isAskingAboutDeveloper(userMessage)) {
      return NextResponse.json({
        reply: getDeveloperIdentityResponse(),
        provider: 'deterministic-developer-identity',
        recommendedService: null,
      });
    }

    // Berikan konteks riwayat (dibatasi MAX_HISTORY) ke shared AI service.
    const contextHistory = history.slice(-MAX_HISTORY).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let reply: string;
    let provider: string | null;
    let recommendedService: unknown = null;

    // 1) Gate domain di SERVER: permintaan di luar cakupan TIDAK menghubungi
    //    NVIDIA API dan TIDAK menyentuh database (hemat kuota + konsisten).
    //    Penolakan tugas memakai teks berbrand Mimo (chatbot publik).
    const verdict = classifyScope(userMessage);
    if (!verdict.allowed) {
      reply = buildScopeRefusal(verdict, 'mimo');
      provider = 'scope-restriction';
    } else {
      // 2) Chatbot publik: TOLAK pertanyaan identitas pribadi / data internal
      //    SEBELUM memanggil NVIDIA atau query database.
      const identityReply = getPublicIdentityGuardReply(userMessage);
      if (identityReply) {
        reply = identityReply;
        provider = 'public-identity-guard';
      } else {
        // 3) Chatbot publik TIDAK PERNAH membaca/mengambil data pesanan pribadi —
        //    guard ini menjawab statis tanpa query apa pun ke tabel pesanan.
        const privacyReply = getPublicChatPrivacyReply(userMessage);
        if (privacyReply) {
          reply = privacyReply;
          provider = 'public-privacy-guard';
        } else {
          // 4) Katalog layanan publik dari PostgreSQL (read-only, tanpa PII)
          //    disuntikkan sebagai konteks sistem agar jawaban harga/layanan
          //    selalu mengikuti database aktual — bukan angka karangan model.
          let ctx: AIGenerationContext | undefined;
          try {
            const catalog = await getPublicCatalog();
            ctx = { catalog, systemContext: formatCatalogBlock(catalog) };
          } catch (err) {
            console.error('Gagal memuat katalog layanan untuk AI:', (err as Error)?.message || err);
          }
          const result = await generateNvidiaChatResponse(contextHistory, userMessage, ctx);
          reply = result.reply;
          provider = result.provider || null;
          recommendedService = result.recommendedService || null;
        }
      }
    }

    return NextResponse.json({
      reply,
      provider,
      recommendedService,
    });
  } catch (error: any) {
    // Jangan meneruskan detail error internal (bisa memuat info upstream).
    console.error('Error pada /api/ai/chat:', error?.message || error);

    return NextResponse.json(
      { error: 'AI sedang tidak dapat dihubungi. Silakan coba lagi dalam beberapa saat.' },
      { status: 500 }
    );
  }
}
