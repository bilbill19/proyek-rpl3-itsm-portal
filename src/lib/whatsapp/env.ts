/**
 * Konfigurasi WhatsApp Cloud API (Meta) & provider alternatif (Fonnte) — SERVER-SIDE ONLY (P5/P6/P6b).
 *
 * Semua rahasia (token Meta, token Fonnte, webhook verify token) dibaca HANYA
 * dari env server dan TIDAK PERNAH dikirim ke frontend, log, atau respons API.
 * Nilai placeholder ("contoh|example|changeme|...") dianggap TIDAK VALID sehingga
 * mode LIVE tidak akan pernah aktif dari kredensial iseng.
 *
 * Provider didukung: 'meta' (default, integrasi lama) | 'fonnte' (Fase-1 demo).
 */

export type WhatsappMode = 'simulation' | 'live';

export interface WhatsappConfig {
  /** Saklar utama — false = tidak ada kiriman apa pun. */
  enabled: boolean;
  mode: WhatsappMode;
  provider: string;
  accessToken?: string;
  /** Token Fonnte (hanya untuk provider 'fonnte') — rahasia, server-side. */
  fonnteToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  webhookVerifyToken?: string;
  templateName: string;
  apiVersion: string;
}

const PLACEHOLDER_RE = /(contoh|example|changeme|change_me|isi_token|your[_-]?|masukkan|placeholder|rahasia_kamu)/i;

function clean(v?: string): string | undefined {
  const s = (v || '').trim();
  return s.length > 0 ? s : undefined;
}

/** Baca konfigurasi env (aman dipanggil berulang; tanpa cache berat). */
export function getWhatsappConfig(): WhatsappConfig {
  const rawMode = (process.env.WHATSAPP_MODE || '').trim().toLowerCase();
  const mode: WhatsappMode = rawMode === 'live' ? 'live' : 'simulation';
  return {
    enabled: process.env.WHATSAPP_ENABLED === 'true',
    mode,
    provider: (process.env.WHATSAPP_PROVIDER || 'meta').trim().toLowerCase() || 'meta',
    accessToken: clean(process.env.WHATSAPP_ACCESS_TOKEN),
    fonnteToken: clean(process.env.FONNTE_TOKEN),
    phoneNumberId: clean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    businessAccountId: clean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
    webhookVerifyToken: clean(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN),
    templateName: clean(process.env.WHATSAPP_TEMPLATE_NAME) || 'itsm_order_status_update',
    apiVersion: clean(process.env.WHATSAPP_API_VERSION) || 'v20.0',
  };
}

export interface LiveConfigOk {
  ok: true;
  config: WhatsappConfig;
}
export interface LiveConfigErr {
  ok: false;
  /** Alasan tersanitasi — aman ditampilkan, TIDAK memuat nilai rahasia. */
  reason: string;
}

/**
 * Validasi ketat untuk mode LIVE. Menolak:
 * - saklar mati / mode bukan live,
 * - token atau ID yang kosong,
 * - nilai placeholder (pencegah LIVE dengan kredensial contoh),
 * - panjang token yang tidak masuk akal (< 20 char).
 */
export function getLiveConfig(): LiveConfigOk | LiveConfigErr {
  const config = getWhatsappConfig();
  if (!config.enabled) return { ok: false, reason: 'WHATSAPP_ENABLED bukan "true" (saklar mati).' };
  if (config.mode !== 'live') return { ok: false, reason: 'WHATSAPP_MODE masih "simulation".' };

  // ---- Gerbang per provider ----
  if (config.provider === 'fonnte') {
    // Validasi khusus Fonnte — Meta TIDAK ikut divalidasi (dan sebaliknya),
    // sehingga pemasangan token Fonnte tak pernah memengaruhi jalur Meta.
    const ftoken = config.fonnteToken;
    if (!ftoken) return { ok: false, reason: 'FONNTE_TOKEN kosong.' };
    if (PLACEHOLDER_RE.test(ftoken)) return { ok: false, reason: 'FONNTE_TOKEN berupa nilai placeholder (bukan token asli).' };
    if (ftoken.length < 20) return { ok: false, reason: 'FONNTE_TOKEN terlalu pendek (bukan token Fonnte valid).' };
    return { ok: true, config };
  }
  if (config.provider !== 'meta') {
    return { ok: false, reason: `Provider "${config.provider}" tidak didukung (didukung: meta, fonnte).` };
  }

  // ---- Gerbang Meta (lama) — urutan & pesan pemeriksaan TIDAK berubah ----
  const token = config.accessToken;
  if (!token) return { ok: false, reason: 'WHATSAPP_ACCESS_TOKEN kosong.' };
  if (PLACEHOLDER_RE.test(token)) return { ok: false, reason: 'WHATSAPP_ACCESS_TOKEN berupa nilai placeholder (bukan token asli).' };
  if (token.length < 20) return { ok: false, reason: 'WHATSAPP_ACCESS_TOKEN terlalu pendek (bukan token Meta valid).' };

  if (!config.phoneNumberId || PLACEHOLDER_RE.test(config.phoneNumberId)) {
    return { ok: false, reason: 'WHATSAPP_PHONE_NUMBER_ID kosong/placeholder.' };
  }
  if (!config.templateName || PLACEHOLDER_RE.test(config.templateName)) {
    return { ok: false, reason: 'WHATSAPP_TEMPLATE_NAME kosong/placeholder.' };
  }
  return { ok: true, config };
}

/** Utilitas nomor telepon — SATU sumber di ./phone (dipakai server & client). */
export { normalizePhone, maskPhone, maskDigitRuns } from './phone';
