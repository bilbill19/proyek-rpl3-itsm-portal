import { describe, expect, test } from 'vitest';
import { getOrderStatusTransitionError } from '../order-status';

describe('getOrderStatusTransitionError', () => {
  test('maju satu tahap diperbolehkan', () => {
    expect(
      getOrderStatusTransitionError('CREATED', 'WAITING_CONFIRMATION')
    ).toBeNull();
  });

  test('melompat beberapa tahap ditolak', () => {
    expect(
      getOrderStatusTransitionError('CREATED', 'CHECKING')
    ).toBe('Perubahan status harus mengikuti urutan tahapan pesanan.');
  });

  test('mundur tanpa catatan ditolak', () => {
    expect(
      getOrderStatusTransitionError('IN_PROGRESS', 'CHECKING')
    ).toBe('Catatan wajib diisi jika status dikembalikan ke tahap sebelumnya.');
  });

  test('mundur dengan catatan diperbolehkan', () => {
    expect(
      getOrderStatusTransitionError('IN_PROGRESS', 'CHECKING', 'Perlu pemeriksaan ulang')
    ).toBeNull();
  });

  test('DELIVERED tidak dapat diubah ke status lain', () => {
    expect(
      getOrderStatusTransitionError('DELIVERED', 'COMPLETED')
    ).toBe('Pesanan yang sudah DELIVERED tidak dapat diubah statusnya.');
  });

  test('status yang sama diperbolehkan', () => {
    expect(
      getOrderStatusTransitionError('IN_PROGRESS', 'IN_PROGRESS')
    ).toBeNull();
  });
});
