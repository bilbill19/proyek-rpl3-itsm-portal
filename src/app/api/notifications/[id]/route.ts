import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/notifications/[id] — tandai SATU notifikasi sebagai dibaca.
 * Kepemilikan diverifikasi: notifikasi milik user lain → 404 (tidak membocorkan
 * keberadaan data via perbedaan 403/404).
 */
export async function PATCH(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: { id, userId: session.id },
      data: { isRead: true },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Notifikasi tidak ditemukan.' }, { status: 404 });
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: session.id, isRead: false },
    });
    return NextResponse.json({ ok: true, unreadCount });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui notifikasi.' },
      { status: 500 }
    );
  }
}
