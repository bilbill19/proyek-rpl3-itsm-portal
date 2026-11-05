import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { kickWhatsappOutbox } from '@/lib/whatsapp/dispatcher';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications — daftar notifikasi milik sesi aktif SAJA (+unread).
 * - Isolasi ketat: filter userId dari token sesi (bukan input user).
 * - Terbaru dulu; sertakan ringkasan order untuk tautan detail.
 * - Sekaligus kick dispatcher outbox (throttled) — menangkap kiriman tertinggal.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    // Picu outbox (fire-and-forget; single-flight + throttle di dalamnya).
    kickWhatsappOutbox();

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          order: { select: { id: true, ticketNumber: true, status: true } },
        },
      }),
      prisma.notification.count({ where: { userId: session.id, isRead: false } }),
    ]);

    return NextResponse.json({ notifications: items, unreadCount });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat notifikasi.' },
      { status: 500 }
    );
  }
}
