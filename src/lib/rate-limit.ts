/**
 * ============================================================================
 * rate-limit.ts — Rate limiter in-memory (sliding window) endpoint AI Smart
 * ============================================================================
 *
 * Dipakai di POST /api/ai/conversations dan POST /api/ai/conversations/[id]/messages
 * dengan kunci per PENGGUNA TERAUTENTIKASI (`ai-smart:<userId>`), bukan per IP:
 *   - Tidak memengaruhi login, registrasi, maupun transaksi pesanan service
 *     (endpoint lain TIDAK melewati modul ini).
 *   - Tidak menyimpan data pribadi — hanya menghitung jumlah request per kunci
 *     di memori proses (reset otomatis setelah jendela waktu).
 *   - Bucket kedaluwarsa dibersihkan berkala agar memori tidak tumbuh.
 *
 * Contoh pemakaian:
 *   if (!checkRateLimit(`ai-smart:${session.id}`, 30, 60_000)) → HTTP 429.
 * ============================================================================
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Batas default AI Smart: 30 request/menit per pelanggan. */
export const AI_SMART_RATE_LIMIT = 30;
/** Jendela waktu default (60 detik). */
export const AI_SMART_RATE_WINDOW_MS = 60_000;

/** Batas tracking publik: 20 request/menit per IP (anti-enumerasi). */
export const TRACK_RATE_LIMIT = 20;
/** Jendela waktu tracking (60 detik). */
export const TRACK_RATE_WINDOW_MS = 60_000;

/**
 * Catat satu request untuk `key`.
 * @returns true bila request DIIZINKAN (di bawah batas), false bila harus 429.
 */
export function checkRateLimit(
  key: string,
  limit: number = AI_SMART_RATE_LIMIT,
  windowMs: number = AI_SMART_RATE_WINDOW_MS
): boolean {
  const now = Date.now();

  // Bersihkan bucket yang sudah kedaluwarsa bila peta mulai besar.
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  return bucket.count <= limit;
}
