import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: any): string {
  if (amount === null || amount === undefined) return 'Rp 0';
  const numeric = typeof amount === 'number' ? amount : Number(amount?.toString?.() ?? amount);
  if (isNaN(numeric)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
}

/**
 * Judul percakapan dari pesan pertama — dipotong di BATAS KATA (maks `max`
 * karakter) dengan elipsis '…', bukan potong tengah kata ("siapa nam...")
 * ala substring mentah. Dipakai route pembuat judul & mirror sisi klien.
 */
export function deriveConversationTitle(text: string, max: number = 40): string {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function getOrderStatusLabel(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'CREATED':
      return { label: 'Order Dibuat', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800 dark:text-slate-300' };
    case 'WAITING_CONFIRMATION':
      return { label: 'Menunggu Konfirmasi', color: 'text-amber-700', bg: 'bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400' };
    case 'DEVICE_RECEIVED':
      return { label: 'Perangkat Diterima', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400' };
    case 'CHECKING':
      return { label: 'Sedang Diagnosa', color: 'text-purple-700', bg: 'bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400' };
    case 'IN_PROGRESS':
      return { label: 'Sedang Dikerjakan', color: 'text-indigo-700', bg: 'bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400' };
    case 'WAITING_APPROVAL':
      return { label: 'Menunggu Persetujuan', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-950/40 dark:text-orange-400' };
    case 'COMPLETED':
      return { label: 'Servis Selesai', color: 'text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400' };
    case 'DELIVERED':
      return { label: 'Sudah Diambil / Dikirim', color: 'text-teal-700', bg: 'bg-teal-100 dark:bg-teal-950/40 dark:text-teal-400' };
    default:
      return { label: status, color: 'text-slate-600', bg: 'bg-slate-100' };
  }
}
