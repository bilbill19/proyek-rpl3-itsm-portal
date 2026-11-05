import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { maskPhone } from '@/lib/whatsapp/env';
import { maskDigitRuns } from '@/lib/whatsapp/phone';

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/deliveries — riwayat kiriman WhatsApp (khusus ADMIN, read-only).
 * Menampilkan mode (simulation|live), status, waktu, attempts, dan pesan error
 * tersanitasi. TIDAK PERNAH menyertakan token/kredensial apa pun
 * (kolom tersebut tidak ada di tabel; error sudah disanitasi saat penulisan).
 * Nomor penerima ditampilkan sebagian (masked) — cukup untuk identifikasi operasional.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya Admin.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const take = Math.min(Number(url.searchParams.get('take')) || 50, 100);

    // Riwayat delivery + ringkasan antrean outbox (sumber status `pending`
    // yang sesungguhnya) — diambil paralel, semuanya READ-ONLY.
    const [items, outboxAgg, queueRows] = await Promise.all([
      prisma.whatsAppDelivery.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          order: { select: { id: true, ticketNumber: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.notificationOutbox.groupBy({ by: ['status'], _count: true }),
      prisma.notificationOutbox.findMany({
        where: { status: { in: ['pending', 'processing'] } },
        orderBy: { nextAttemptAt: 'asc' },
        take: 10,
        select: {
          id: true,
          eventType: true,
          status: true,
          attempts: true,
          nextAttemptAt: true,
          lastError: true,
          createdAt: true,
          payload: true,
        },
      }),
    ]);

    // Semua status outbox SELALU ikut (0 = angka nyata dari DB, bukan placeholder).
    const outboxByStatus: Record<string, number> = { pending: 0, processing: 0, done: 0, failed: 0 };
    for (const r of outboxAgg) outboxByStatus[r.status] = r._count;

    // Antrean berjalan: hanya METADATA — payload asli (memuat nomor telepon
    // pelanggan) TIDAK PERNAH disertakan; hanya tiket & status order diambil.
    const outboxQueue = queueRows.map((row) => {
      let ticketNumber: string | null = null;
      let orderStatus: string | null = null;
      try {
        const p = JSON.parse(row.payload);
        if (typeof p?.ticketNumber === 'string') ticketNumber = p.ticketNumber;
        if (typeof p?.status === 'string') orderStatus = p.status;
      } catch {
        // payload rusak → baris tetap ditampilkan tanpa rujukan tiket
      }
      return {
        id: row.id,
        eventType: row.eventType,
        status: row.status, // pending | processing
        attempts: row.attempts,
        nextAttemptAt: row.nextAttemptAt,
        lastError: row.lastError ? maskDigitRuns(row.lastError).slice(0, 200) : null,
        ticketNumber,
        orderStatus,
        createdAt: row.createdAt,
      };
    });

    return NextResponse.json({
      deliveries: items.map((d) => ({
        id: d.id,
        ticketNumber: d.order?.ticketNumber || null,
        customerName: d.user?.name || '-',
        toPhoneMasked: maskPhone(d.toPhone),
        templateName: d.templateName,
        mode: d.mode, // simulation | live
        status: d.status, // simulated | sent | failed
        attempts: d.attempts,
        error: d.error,
        providerMessageId: d.providerMessageId,
        createdAt: d.createdAt,
      })),
      outbox: {
        byStatus: outboxByStatus, // pending | processing | done | failed
        queue: outboxQueue,
      },
    });
  } catch (error: any) {
    console.error('Error fetching whatsapp deliveries:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memuat riwayat WhatsApp.' },
      { status: 500 }
    );
  }
}
