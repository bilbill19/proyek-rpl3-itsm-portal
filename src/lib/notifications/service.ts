/**
 * Service Notifikasi (P4) — pembuatan notifikasi in-app pesanan.
 *
 * Aturan:
 * - Notifikasi status pesanan dibuat DALAM transaksi yang sama dengan update
 *   status → bila update gagal/rollback, notifikasi ikut hilang (tidak ada
 *   notifikasi dari operasi yang gagal).
 * - Idempotensi via unique (orderId, dedupKey): "status:IN_PROGRESS" — perubahan
 *   status yang sama pada pesanan yang sama TIDAK menghasilkan duplikat;
 *   upsert justru me-refresh judul/body & menandai unread lagi bila status
 *   berputar kembali.
 * - Konten dihasilkan dari data order nyata (ticketNumber + label status dari
 *   getOrderStatusLabel) — tanpa halusinasi.
 */
import type { Prisma } from '@prisma/client';
import { getOrderStatusLabel } from '@/lib/utils';

export type Tx = Prisma.TransactionClient;

export interface OrderStatusNotificationContent {
  type: string;
  title: string;
  body: string;
  dedupKey: string;
}

export function orderStatusNotificationContent(
  ticketNumber: string,
  status: string
): OrderStatusNotificationContent {
  const { label } = getOrderStatusLabel(status);
  return {
    type: 'order_status',
    title: 'Status Pesanan Diperbarui',
    body: `Tiket ${ticketNumber} kini berstatus: ${label}.`,
    dedupKey: `status:${status}`,
  };
}

/**
 * Upsert notifikasi status di DALAM transaksi `tx`.
 * Panggil HANYA ketika status benar-benar berubah (guard di route PATCH).
 */
export async function upsertOrderStatusNotification(
  tx: Tx,
  params: { userId: string; orderId: string; ticketNumber: string; status: string }
): Promise<void> {
  const content = orderStatusNotificationContent(params.ticketNumber, params.status);
  await tx.notification.upsert({
    where: {
      orderId_dedupKey: { orderId: params.orderId, dedupKey: content.dedupKey },
    },
    create: {
      userId: params.userId,
      orderId: params.orderId,
      type: content.type,
      title: content.title,
      body: content.body,
      dedupKey: content.dedupKey,
    },
    update: {
      title: content.title,
      body: content.body,
      isRead: false, // status berputar kembali → tampilkan sebagai belum dibaca
    },
  });
}
