/**
 * smalltalk.ts — Balasan sapaan/penutup PERCAKAPAN deterministik (instan).
 *
 * Sapaan ("Halo.") dan penutup ("Terima kasih, konsultasinya sudah selesai.")
 * tidak membutuhkan provider generatif maupun data database — dijawab langsung
 * dari identitas resmi (branding.ts) dalam <1 detik, tanpa menunggu latency
 * NVIDIA NIM (dan tanpa memicu timeout saat provider sedang gangguan).
 *
 * AMAN:
 *   - Hanya cocok untuk pesan PENDEK persis (regex whole-string) — pesan
 *     panjang/berisi pertanyaan/tanda tanya TIDAK pernah tertangkap.
 *   - Kata kunci data (pesanan, berapa, harga, dst.) mengecualikan pesan dari
 *     jalur ini — pertanyaan data tetap lewat pipeline normal.
 *   - Tidak mengakses database, tidak melanggar scope gate (dipanggil SETELAH
 *     scope gate & cek identitas di pipeline).
 */

import { MIMO, MIKO, MIKO_ADMIN_GREETING } from './branding';

export interface SmalltalkOptions {
  brand: 'mimo' | 'miko';
  /** true untuk konteks Miko ADMIN (tampilan sapaan admin). */
  isAdmin?: boolean;
}

/** Sapaan murni — regex sama dengan jalur fallback ExpertEngine. */
const GREETING_ONLY =
  /^(?:halo|hai|hi|hello|hey|pagi|siang|sore|malam|assalamualaikum|ok|oke|siap|mantap)(?:\s+(?:ya|dong|juga|banyak|banget|semua))*[!?.,\s]*$/i;

/** Penutup percakapan: diawali terima kasih (varian ejaan Indonesia/Inggris). */
const THANKS_ONLY = /^(?:terima kasih|makasih|thx|thanks|thank you|tengkyu)\b/i;

/** Kata kunci PERTANYAAN DATA/TEKNIS — pesan mengandung ini bukan smalltalk. */
const DATA_KEYWORDS =
  /pesanan|tiket|order|invoice|harga|biaya|tarif|stok|inventaris|customer|pelanggan|laporan|revenue|status|berapa|tunjukkan|sebutkan|tampilkan|diagnos|error|rusak|mati|panas|wifi|jaringan/i;

/**
 * Balas smalltalk bila pesan termasuk sapaan/penutup murni; null = biarkan
 * pipeline/provider menangani seperti biasa.
 */
export function getSmalltalkReply(
  userText: string,
  opts: SmalltalkOptions
): string | null {
  const text = (userText || '').trim();
  if (!text || text.length > 100) return null;

  // Penutup percakapan — sapaan pembuka TIDAK boleh menelan pertanyaan data.
  if (
    THANKS_ONLY.test(text) &&
    !text.includes('?') &&
    !DATA_KEYWORDS.test(text)
  ) {
    if (opts.brand === 'mimo') {
      return 'Sama-sama! Senang bisa membantu. Kalau ada masalah perangkat lagi — laptop, komputer, atau jaringan — chat aku lagi, ya. Aku standby di sini! 😊';
    }
    return opts.isAdmin
      ? 'Baik, sama-sama! Jika nanti ada pertanyaan operasional lagi (pesanan, customer, inventaris, finansial), silakan tanyakan kapan saja — saya Miko standby.'
      : 'Sama-sama! Senang bisa membantu. Jika ada gejala perangkat baru atau pertanyaan lain, silakan konsultasi lagi kapan saja — saya Miko di sini.';
  }

  // Sapaan murni tanpa isi lain.
  if (GREETING_ONLY.test(text)) {
    if (opts.brand === 'mimo') {
      return MIMO.greeting;
    }
    return opts.isAdmin ? MIKO_ADMIN_GREETING : MIKO.greeting;
  }

  return null;
}
