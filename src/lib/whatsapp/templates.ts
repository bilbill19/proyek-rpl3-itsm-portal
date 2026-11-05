/**
 * Template pesan WhatsApp (P5) — isi diturunkan dari data order NYATA.
 *
 * Untuk mode LIVE dipakai "message template" resmi Meta yang sudah APPROVED
 * (parameter positional {{1}} {{2}} {{3}}). Untuk mode SIMULATION hanya
 * membangun teks preview yang disimpan sebagai riwayat — TANPA HTTP ke Meta
 * dan TIDAK pernah diklaim sebagai "terkirim/delivered".
 */
import { getOrderStatusLabel } from '@/lib/utils';

export interface OrderStatusMessage {
  /** Nama template resmi Meta (harus APPROVED untuk LIVE). */
  templateName: string;
  /** Teks preview (mode simulasi / referensi admin). */
  previewText: string;
  /** Parameter positional untuk template LIVE: [nama, tiket, status]. */
  params: string[];
}

export function buildOrderStatusMessage(input: {
  templateName: string;
  customerName: string;
  ticketNumber: string;
  status: string;
}): OrderStatusMessage {
  const { label } = getOrderStatusLabel(input.status);
  const name = input.customerName.trim() || 'Pelanggan';
  const previewText =
    `Halo ${name}, tiket *${input.ticketNumber}* kini berstatus *${label}*. ` +
    `Silakan pantau perkembangannya di portal ITSM Portal. Terima kasih.`;
  return {
    templateName: input.templateName,
    previewText,
    params: [name, input.ticketNumber, label],
  };
}
