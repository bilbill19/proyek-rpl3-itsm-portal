import { NextResponse } from 'next/server';
import { getWhatsappConfig } from '@/lib/whatsapp/env';

/**
 * Webhook Meta WhatsApp (P6).
 *
 * GET  — verifikasi handshake Meta:
 *        ?hub.mode=verify&hub.verify_token=<TOKEN>&hub.challenge=<CHALLENGE>
 *        Balas `hub.challenge` HANYA bila mode=verify dan token cocok
 *        (dengan perbandingan berdurasi konstan). Tanpa token valid → 403.
 *
 * POST — pemberitahuan status pengiriman dari Meta. Dibaca & diakui 200 saja
 *        (tanpa penyimpanan, tanpa logging payload yang berpotensi sensitif;
 *        parser body aman bila JSON rusak/bukan JSON).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const expected = getWhatsappConfig().webhookVerifyToken;
    if (mode === 'verify' && expected && token && timingSafeEqual(token, expected)) {
      return new NextResponse(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    return NextResponse.json({ error: 'Verifikasi gagal.' }, { status: 403 });
  } catch {
    return NextResponse.json({ error: 'Verifikasi gagal.' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  // Baca & akui tanpa efek samping (tidak ada logging body).
  await request.text().catch(() => '');
  return NextResponse.json({ ok: true });
}

/** Perbandingan string berdurasi konstan (sederhana, tanpa dependensi). */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length, 1);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  }
  return diff === 0;
}
