import { OrderStatus } from '@prisma/client';

const ORDER_STATUS_FLOW: OrderStatus[] = [
  'CREATED',
  'WAITING_CONFIRMATION',
  'DEVICE_RECEIVED',
  'CHECKING',
  'IN_PROGRESS',
  'WAITING_APPROVAL',
  'COMPLETED',
  'DELIVERED',
];

export function getOrderStatusTransitionError(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus,
  note?: string | null
): string | null {
  if (currentStatus === targetStatus) {
    return null;
  }

  if (currentStatus === 'DELIVERED') {
    return 'Pesanan yang sudah DELIVERED tidak dapat diubah statusnya.';
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);
  const targetIndex = ORDER_STATUS_FLOW.indexOf(targetStatus);

  if (targetIndex === currentIndex + 1) {
    return null;
  }

  if (targetIndex < currentIndex) {
    if (!note?.trim()) {
      return 'Catatan wajib diisi jika status dikembalikan ke tahap sebelumnya.';
    }

    return null;
  }

  return 'Perubahan status harus mengikuti urutan tahapan pesanan.';
}
