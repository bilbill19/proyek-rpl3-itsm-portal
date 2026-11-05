import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { ExpertEngineProvider, type ChatMessage } from '@/lib/ai';
import { buildScopeRefusal, classifyScope } from '@/lib/ai/scope';
import {
  formatCatalogBlock,
  getCatalogReply,
  getPublicCatalog,
} from '@/lib/customer-context';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/mimo-demo — DEMO MIMO (Presentasi Admin, jalur LOKAL saja).
 *
 * Menjalankan pipeline Mimo pada sisi lokal tanpa menyentuh provider AI eksternal:
 *   1. Gate domain        — classifyScope (logika sama dengan route produksi /api/ai/chat).
 *   2. Konteks katalog    — getPublicCatalog (PostgreSQL READ-ONLY, sumber data sama
 *                           dengan Mimo publik).
 *   3. Jalur deterministik— getCatalogReply (jawaban harga/layanan dihitung dari database).
 *   4. Fallback lokal     — ExpertEngineProvider beridentitas 'mimo' (mesin diagnosis
 *                           built-in, tanpa request jaringan).
 *
 * JAMINAN DEMO (presentasi tanpa kuota NVIDIA):
 *   - NvidiaNimProvider TIDAK PERNAH diimport/dipanggil di route ini → demo mustahil
 *     menghubungi NVIDIA NIM, berapa pun kali dijalankan.
 *   - Admin-only (getSession + role ADMIN) + rate limit + validasi zod.
 *   - TIDAK MENULIS database apa pun (hanya baca katalog) → jawaban demo tidak pernah
 *     tersimpan sebagai percakapan Customer.
 *   - Label `provider` mencerminkan jalur pemrosesan SESUNGGUHNYA (tanpa label
 *     'nvidia-nim' karena NIM memang tidak dipanggil).
 *   - Cooldown/timeout/provider/model/API key NVIDIA tidak disentuh oleh route ini.
 */

const demoRequestSchema = z.object({
  message: z.string().trim().min(1, 'Pesan tidak boleh kosong.').max(500, {
    message: 'Pesan maksimal 500 karakter.',
  }),
});

export async function POST(request: Request) {
  // Otorisasi: hanya ADMIN yang boleh menjalankan demo.
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Hanya untuk administrator.' }, { status: 403 });
  }

  if (!checkRateLimit(`mimo-demo:${session.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: 'Terlalu banyak permintaan demo. Coba lagi dalam satu menit.' },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = demoRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Input tidak valid.' },
      { status: 400 }
    );
  }
  const message = parsed.data.message;
  const startedAt = performance.now();

  const respond = (reply: string, provider: string, recommendedService: unknown = null) =>
    NextResponse.json({
      reply,
      provider,
      recommendedService,
      durationMs: Math.round(performance.now() - startedAt),
    });

  // 1) Gate domain — penolakan di luar topik ITSM terjadi TANPA AI, seperti produksi.
  const verdict = classifyScope(message);
  if (!verdict.allowed) {
    return respond(buildScopeRefusal(verdict, 'mimo'), 'scope-restriction');
  }

  // 2) Katalog layanan dari database (read-only). Bila gagal diload, lanjut tanpa katalog.
  const catalog = await getPublicCatalog().catch(() => []);

  // 3) Jalur deterministik: jawaban katalog dihitung dari database, bukan model AI.
  const catalogReply = getCatalogReply(message, catalog);
  if (catalogReply) {
    return respond(catalogReply, 'deterministic-catalog');
  }

  // 4) ExpertEngine LOKAL beridentitas Mimo — mesin diagnosis built-in tanpa jaringan.
  //    Blok katalog disuntikkan sebagai pesan SYSTEM (pola yang sama dengan produksi).
  const engine = new ExpertEngineProvider('mimo');
  const messages: ChatMessage[] = catalog.length
    ? [
        { role: 'SYSTEM', content: formatCatalogBlock(catalog) },
        { role: 'USER', content: message },
      ]
    : [{ role: 'USER', content: message }];
  const result = await engine.generateResponse(messages, message);

  return respond(result.reply, 'expert-engine', result.recommendedService ?? null);
}
