/**
 * Adapter provider FONNTE (gateway tak-resmi multi-device) — Fase 1 demo.
 *
 * Kontrak API (docs.fonnte.com, terverifikasi):
 * - POST https://api.fonnte.com/send — header `Authorization: <token>` (polos),
 *   body multipart/form-data: target, message, countryCode.
 * - `countryCode` WAJIB string; set '0' = menonaktifkan penggantian → target
 *   wajib E.164 penuh (62…) — format persis keluaran normalizePhone kita.
 * - Respons sukses: {status:true, id:<messageId>} = DITERIMA GATEWAY
 *   (BUKAN bukti masuk ke HP — lihat label riwayat "Diterima gateway").
 * - 1 token = 1 device = 1 nomor pengirim (scan QR Linked Devices).
 *
 * Token HANYA dibaca dari env server (FONNTE_TOKEN via getLiveConfig) dan
 * TIDAK PERNAH masuk string error/log/DB.
 *
 * Kebijakan retry (selaras dengan meta.ts):
 * - Timeout 15s (AbortError) → retryable=false (status tak diketahui —
 *   mencegah kiriman ganda).
 * - Galat jaringan sebelum request terkirim → retryable=true.
 * - HTTP 429/5xx → retryable=true; 401/403 (token), 402 (kuota), 4xx lain,
 *   dan body {status:false} non-transien → retryable=false.
 * - Device tidak tersambung → retryable=true (Fonnte sendiri juga mengulang
 *   otomatis tiap menit bila pesan sudah diterima antrean).
 */
import { getLiveConfig } from '../env';
import { maskDigitRuns } from '../phone';
import type { SendResult } from '../meta';
import type { ProviderSendInput, WhatsAppProvider } from './types';

const ENDPOINT = 'https://api.fonnte.com/send';
const TIMEOUT_MS = 15_000;

/** Body request Fonnte (diekspor untuk pengujian unit TANPA HTTP). */
export function buildFonnteRequestBody(input: { to: string; text: string }) {
  return {
    target: input.to,
    message: input.text,
    // STRING '0' = disable replacement (dokumentasi Fonnte: target E.164 penuh).
    countryCode: '0',
  };
}

/**
 * Kelasifikasi kegagalan Fonnte → pesan AMAN (tanpa token, nomor dimasking)
 * + keputusan retry. Diekspor untuk pengujian unit.
 */
export function classifyFonnteFailure(input: {
  httpStatus?: number;
  bodyReason?: string;
  secretToken?: string;
}): { error: string; retryable: boolean } {
  const { httpStatus, bodyReason, secretToken } = input;

  let safe = bodyReason ? String(bodyReason).replace(/\s+/g, ' ').trim() : '';
  // Pertahanan berlapis: sekali pun alasan gateway memuat nilai token, buang.
  if (secretToken && safe.includes(secretToken)) safe = safe.split(secretToken).join('[redacted]');
  safe = maskDigitRuns(safe).slice(0, 300); // nomor ≥9 digit dimasking

  const withReason = (label: string) => (safe ? `${label} Alasan: ${safe}` : label);

  // --- Galat HTTP non-2xx ---
  if (httpStatus !== undefined) {
    if (httpStatus === 401 || httpStatus === 403) {
      return { error: 'Fonnte menolak token (401/403) — FONNTE_TOKEN tidak valid/kedaluwarsa.', retryable: false };
    }
    if (httpStatus === 402) {
      return { error: 'Fonnte 402 — kuota/paket akun bermasalah (cek tagihan & limit paket).', retryable: false };
    }
    if (httpStatus === 429) {
      return { error: withReason('Fonnte 429 — rate limit gateway.'), retryable: true };
    }
    if (httpStatus >= 500) {
      return { error: withReason(`Fonnte ${httpStatus} — gangguan server Fonnte.`), retryable: true };
    }
    return { error: withReason(`Fonnte ${httpStatus} — permintaan ditolak.`), retryable: false };
  }

  // --- HTTP 200 tetapi {status:false, reason:...} — urutan kata kunci penting ---
  const r = safe.toLowerCase();
  if (/(token|unauthoriz|forbidden|credential)/.test(r)) {
    return { error: withReason('Fonnte: token ditolak.'), retryable: false };
  }
  if (/(limit|kuota|quota|exceed|balance|expired|package|plan|upgrade|subscribe)/.test(r)) {
    return { error: withReason('Fonnte: kuota/paket tidak mencukupi.'), retryable: false };
  }
  if (/(device|connect|offline|pending)/.test(r)) {
    return { error: withReason('Fonnte: device pengirim tidak tersambung.'), retryable: true };
  }
  if (/(invalid|not exist|registered|number|target)/.test(r)) {
    return { error: withReason('Fonnte: nomor tujuan tidak valid.'), retryable: false };
  }
  return { error: withReason('Fonnte: pengiriman ditolak gateway.'), retryable: false };
}

/**
 * Kirim pesan teks via Fonnte. Dipanggil HANYA dari adapter setelah gerbang
 * getLiveConfig() lolos. Tidak pernah melempar exception.
 */
export async function sendFonnteMessage(input: { to: string; text: string }): Promise<SendResult> {
  const cfg = getLiveConfig();
  if (!cfg.ok) return { ok: false, error: cfg.reason, retryable: false };
  const token = cfg.config.fonnteToken;
  if (!token) return { ok: false, error: 'FONNTE_TOKEN kosong.', retryable: false };

  const body = buildFonnteRequestBody(input);
  const form = new FormData();
  form.set('target', body.target);
  form.set('message', body.message);
  form.set('countryCode', body.countryCode);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: token },
      body: form,
      signal: controller.signal,
    });

    const raw = await res.text().catch(() => '');
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const reason =
        (typeof parsed?.reason === 'string' && parsed.reason) ||
        (typeof parsed?.message === 'string' && parsed.message) ||
        (raw && raw.length < 200 ? raw : '');
      const cls = classifyFonnteFailure({ httpStatus: res.status, bodyReason: reason, secretToken: token });
      return { ok: false, error: cls.error.slice(0, 500), retryable: cls.retryable };
    }

    if (parsed && parsed.status === true) {
      // DITERIMA GATEWAY (bukan bukti delivered — Fonnte tak memberi receipt).
      const id = parsed.id;
      return { ok: true, messageId: id !== undefined && id !== null ? String(id) : undefined };
    }

    const reason =
      (typeof parsed?.reason === 'string' && parsed.reason) || (raw && raw.length < 200 ? raw : 'respons tidak dikenal');
    const cls = classifyFonnteFailure({ bodyReason: reason, secretToken: token });
    return { ok: false, error: cls.error.slice(0, 500), retryable: cls.retryable };
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.name === 'TimeoutError') {
      // Status tak diketahui — JANGAN retry otomatis (mencegah kiriman ganda).
      return {
        ok: false,
        error: `Timeout ${TIMEOUT_MS / 1000}s — status pengiriman tidak diketahui; tidak dicoba ulang.`,
        retryable: false,
      };
    }
    // Galat jaringan sebelum request terkirim → boleh retry terbatas.
    return { ok: false, error: 'Gagal menghubungi server Fonnte (jaringan).', retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

export const fonnteProvider: WhatsAppProvider = {
  name: 'fonnte',
  async send(input: ProviderSendInput): Promise<SendResult> {
    return sendFonnteMessage({ to: input.to, text: input.text });
  },
};
