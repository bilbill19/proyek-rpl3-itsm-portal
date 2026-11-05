/**
 * ============================================================================
 * POST /api/ai/admin  ->  AI Admin Assistant (API-Only, No UI)
 * ============================================================================
 *
 * Endpoint khusus ADMIN untuk pertanyaan operasional ITSM Portal.
 * - Hanya role ADMIN (401/403 untuk lain)
 * - NVIDIA NIM provider utama + ExpertEngine fallback
 * - Knowledge layer: router → tools (Prisma read-only, aggregated)
 * - Scope restriction berlaku (OOT ditolak sebelum provider)
 * - Konteks DB disuntikkan sebagai SYSTEM message (bukan user message)
 * - Rate limit per admin user (30/menit)
 *
 * Pipeline generasi memakai generateRoleReply() yang SAMA dengan halaman
 * /admin/ai (percakapan berbasis riwayat) — satu implementasi, tanpa duplikasi.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkRateLimit, AI_SMART_RATE_LIMIT, AI_SMART_RATE_WINDOW_MS } from '@/lib/rate-limit';
import { generateRoleReply } from '@/lib/ai/pipeline';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (bukan Edge) — wajib untuk Prisma/PostgreSQL & pipeline AI.
export const runtime = 'nodejs';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 10;

const adminChatSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong.').max(MAX_MESSAGE_LENGTH),
  history: z
    .array(
      z.object({
        role: z.enum(['USER', 'ASSISTANT']),
        content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
      })
    )
    .max(MAX_HISTORY)
    .default([]),
});

export async function POST(request: Request) {
  try {
    // 1. Autentikasi & Otorisasi: Hanya ADMIN
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    // 2. Rate limiting per admin user
    if (!checkRateLimit(`ai-admin:${session.id}`, AI_SMART_RATE_LIMIT, AI_SMART_RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan AI Admin. Silakan tunggu sebentar lagi.' },
        { status: 429 }
      );
    }

    // 3. Validasi input
    const body = await request.json().catch(() => null);
    const parsed = adminChatSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0];
      return NextResponse.json(
        { error: first?.message || 'Input tidak valid.' },
        { status: 400 }
      );
    }

    const { message, history } = parsed.data;
    const userMessage = message.trim();

    // 4. Siapkan riwayat untuk konteks AI
    const contextHistory = history.slice(-MAX_HISTORY).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 5. Pipeline bersama (identitas pengembang → scope gate → identitas admin
    //    → konteks operasional database → NVIDIA NIM + fallback ExpertEngine).
    const result = await generateRoleReply(session, userMessage, contextHistory);

    return NextResponse.json({
      reply: result.reply,
      provider: result.provider,
      recommendedService: result.recommendedService ?? null,
      scopeReason: result.scopeReason,
    });
  } catch (error: any) {
    console.error('Error pada /api/ai/admin:', error?.message || error);
    return NextResponse.json(
      { error: 'AI Admin sedang tidak dapat dihubungi. Silakan coba lagi dalam beberapa saat.' },
      { status: 500 }
    );
  }
}
