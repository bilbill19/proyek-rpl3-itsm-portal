import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { OrderStatus } from '@prisma/client';
import { upsertOrderStatusNotification } from '@/lib/notifications/service';
import { kickWhatsappOutbox, processOutbox } from '@/lib/whatsapp/dispatcher';
import { getWhatsappConfig } from '@/lib/whatsapp/env';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET: Ambil detail order
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        },
        service: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    // Customer hanya boleh melihat pesanan miliknya, Admin boleh melihat semua
    if (session.role !== 'ADMIN' && order.customerId !== session.id) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Error fetching order detail:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}

// PATCH: Update status, catatan, estimasi harga, dan harga final (Khusus ADMIN)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Akses ditolak. Hanya Admin yang dapat mengubah status & harga pesanan.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, note, estimatedPrice, finalPrice } = body;

    // Ambil data order lama
    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 });
    }

    const targetStatus = (status as OrderStatus) || existingOrder.status;

    // Persiapkan data update untuk ServiceOrder
    const updateData: any = {};
    if (status) {
      updateData.status = targetStatus;
    }
    if (estimatedPrice !== undefined && estimatedPrice !== null && estimatedPrice !== '') {
      updateData.estimatedPrice = Number(estimatedPrice);
    }
    if (finalPrice !== undefined && finalPrice !== null && finalPrice !== '') {
      updateData.finalPrice = Number(finalPrice);
    }

    // Jalankan update dan penambahan history dalam transaksi
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update data ServiceOrder
      const ord = await tx.serviceOrder.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          service: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
        },
      });

      // 2. Simpan entri baru ke ServiceOrderStatusHistory jika status berubah atau ada catatan yang disertakan
      if (status !== existingOrder.status || (note && note.trim().length > 0)) {
        await tx.serviceOrderStatusHistory.create({
          data: {
            orderId: id,
            status: targetStatus,
            note: note && note.trim().length > 0 ? note.trim() : `Status diperbarui menjadi ${targetStatus} oleh Administrator (${session.name}).`,
          },
        });
      }

      // 3. P4/P5 — Notifikasi in-app + baris outbox WhatsApp DALAM transaksi ini:
      //    bila transaksi gagal/rollback, notifikasi & outbox ikut terhapus
      //    (tidak ada notifikasi dari update yang gagal). Hanya saat status
      //    BENAR-BENAR berubah; dedupKey unik mencegah duplikat.
      if (status && status !== existingOrder.status) {
        await upsertOrderStatusNotification(tx, {
          userId: ord.customerId,
          orderId: ord.id,
          ticketNumber: ord.ticketNumber,
          status: targetStatus,
        });
        await tx.notificationOutbox.create({
          data: {
            eventType: 'order_status_whatsapp',
            payload: JSON.stringify({
              orderId: ord.id,
              userId: ord.customerId,
              ticketNumber: ord.ticketNumber,
              customerName: ord.customer?.name || 'Pelanggan',
              phone: ord.customer?.phone || null,
              status: targetStatus,
            }),
          },
        });
      }

      return ord;
    });

    // 4. DI LUAR transaksi — dispatcher WhatsApp (tidak pernah HTTP dalam transaksi).
    //    Simulation/disabled: deterministik (riwayat preview siap sebelum respons).
    //    Mode LIVE: async non-blocking agar respons admin tidak menunggu Graph API.
    const waCfg = getWhatsappConfig();
    if (waCfg.enabled && waCfg.mode === 'live') {
      kickWhatsappOutbox();
    } else {
      await processOutbox().catch((e) => {
        console.error('[wa-outbox] proses setelah update status gagal:', e instanceof Error ? e.message : 'unknown');
      });
    }

    // Ambil data terbaru dengan statusHistory terupdate
    const freshOrder = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        service: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({
      message: 'Status dan data pesanan servis berhasil diperbarui!',
      order: freshOrder,
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memperbarui data pesanan servis.' },
      { status: 500 }
    );
  }
}
