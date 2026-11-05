/**
 * Utilitas nomor telepon WhatsApp — MODUL MURNI (tanpa env/secret).
 *
 * Dipakai bersama oleh server (dispatcher, route) DAN client
 * (AdminCustomersManager) sehingga seluruh titik normalisasi memakai SATU
 * logika yang sama — tidak ada lagi duplikasi yang bisa menyimpang.
 */

/**
 * Normalisasi nomor telepon Indonesia → format E.164 tanpa "+" (62xxxxxxxxxx).
 * Mengembalikan null bila tidak valid (kosong/non-digit/terlalu pendek).
 *
 * Urutan cabang penting:
 * - "00" (prefix internasional) DIDAHULUKAN sebelum "0" (lokal) — jika tidak,
 *   input `0062…` tertelan cabang "0" dan menghasilkan `6206…` yang salah
 *   (atau ditolak). Perbaikan bug prefix-00 (fase demo WhatsApp).
 * - Setelah strip "00", hasil yang masih berawalan "0"/"8" dinormalisasi lagi.
 */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  if (!/^62\d{9,13}$/.test(digits)) return null;
  return digits;
}

/** Tampilkan nomor sebagian (riwayat admin): 0812****7890. */
export function maskPhone(raw?: string | null): string {
  if (!raw) return '-';
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 6) return digits || '-';
  const head = digits.slice(0, 5);
  const tail = digits.slice(-3);
  return `${head}${'*'.repeat(Math.max(2, digits.length - 8))}${tail}`;
}

/**
 * Samarkan SETIAP rentetan digit berpanjang (≥9) di dalam teks bebas —
 * dipakai untuk pesan error Meta yang kadang memuat nomor penerima.
 * Kode error pendek (mis. 131031) TIDAK tersentuh (≤8 digit).
 */
export function maskDigitRuns(text: string): string {
  return text.replace(/\d{9,}/g, (m) => {
    const head = m.slice(0, 5);
    const tail = m.slice(-3);
    return `${head}${'*'.repeat(Math.max(2, m.length - 8))}${tail}`;
  });
}
