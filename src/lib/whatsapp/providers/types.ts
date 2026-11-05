/**
 * Kontrak provider WhatsApp (Fase 1 — adapter multi-provider).
 *
 * Sengaja SEMPIT: dispatcher hanya butuh `send()` yang menghasilkan SendResult
 * yang sama seperti integrasi Meta lama {ok, messageId?, error?, retryable?}
 * — sehingga alur pesanan, notifikasi in-app, outbox, retry, opt-in, dan
 * delivery history TIDAK PERLU TAHU provider mana pun yang dipakai.
 *
 * Validasi kredensial tetap di `getLiveConfig()` (env.ts, bercabang per
 * provider) — adapter tidak membuka jalur kirim di luar gerbang tersebut.
 */
import type { SendResult } from '../meta';

export interface ProviderSendInput {
  /** E.164 tanpa "+", hasil normalizePhone — contoh: 6281234567890 */
  to: string;
  /** Teks pesan final (dipakai provider teks seperti Fonnte; referensi untuk Meta). */
  text: string;
  /** Nama template resmi Meta (untuk provider Meta & pencatatan riwayat). */
  templateName: string;
  /** Parameter positional Meta — 3 nilai: [nama, tiket, status]. */
  params: string[];
}

export interface WhatsAppProvider {
  readonly name: 'meta' | 'fonnte';
  /**
   * Kirim satu pesan. HANYA dipanggil dispatcher SETELAH gerbang
   * getLiveConfig() lolos (saklar ON + mode live + opt-in customer).
   * Tak boleh melempar exception — semua kegagalan dikembalikan sebagai
   * {ok:false, error tersanitasi, retryable}.
   */
  send(input: ProviderSendInput): Promise<SendResult>;
}
