import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/read-all — tandai SEMUA notifikasi milik sesi aktif.
 * Hanya menyentuh baris `userId = sesi` (isolasi antar customer).
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: { userId: session.id, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true, updated: result.count, unreadCount: 0 });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui notifikasi.' },
      { status: 500 }
    );
  }
}
