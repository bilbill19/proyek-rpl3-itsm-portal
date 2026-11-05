import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/preferences — preferensi WhatsApp milik sesi aktif.
 * Mengembalikan nomor TERSIMPAN (milik user sendiri, bukan milik user lain)
 * + status opt-in. Tidak pernah menyertakan token/kredensial server.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const [user, pref] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.id },
        select: { phone: true },
      }),
      prisma.notificationPreference.findUnique({
        where: { userId_channel: { userId: session.id, channel: 'whatsapp' } },
      }),
    ]);

    return NextResponse.json({
      phone: user?.phone || null,
      enabled: pref?.enabled ?? false,
      channel: 'whatsapp',
    });
  } catch (error: any) {
    console.error('Error fetching whatsapp preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat preferensi.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/whatsapp/preferences — opt-in/opt-out WhatsApp (P7).
 * Body: { enabled: boolean }. Tidak ada mekanisme verifikasi nomor di sistem
 * ini — nomor bersifat tersimpan (diinput saat registrasi), bukan terverifikasi.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Format tidak valid. Field "enabled" harus boolean.' },
        { status: 400 }
      );
    }

    const pref = await prisma.notificationPreference.upsert({
      where: { userId_channel: { userId: session.id, channel: 'whatsapp' } },
      create: { userId: session.id, channel: 'whatsapp', enabled: body.enabled },
      update: { enabled: body.enabled },
    });

    return NextResponse.json({ ok: true, enabled: pref.enabled, channel: pref.channel });
  } catch (error: any) {
    console.error('Error updating whatsapp preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui preferensi.' },
      { status: 500 }
    );
  }
}
