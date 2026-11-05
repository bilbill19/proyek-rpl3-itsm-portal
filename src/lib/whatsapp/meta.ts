/**
 * Adapter WhatsApp Cloud API — Meta Graph API (P5).
 *
 * HANYA dipanggil dari dispatcher (di LUAR transaksi DB). Token tidak pernah
 * ikut dalam string error/log (pesan error Meta disanitasi — body JSON dibaca
 * lalu hanya `error.message` yang dipakai, header Authorization tidak pernah
 * dicetak).
 */
import { getLiveConfig, type WhatsappConfig } from './env';
import { maskDigitRuns } from './phone';

export interface SendResult {
  ok: boolean;
  messageId?: string;
  /** Pesan tersanitasi (tanpa token) — aman disimpan di DB. */
  error?: string;
  /** true bila layak dicoba ulang (permintaan kemungkinan tak terkirim). */
  retryable?: boolean;
}

/** Hasil klasifikasi error Graph API — semuanya AMAN disimpan/ditampilkan. */
export interface MetaErrorInfo {
  /** String tersanitasi: label kode + pesan (nomor ≥9 digit sudah dimasking). */
  safeMessage: string;
  code?: number;
  subcode?: number;
  retryable: boolean;
  /** true bila kode dikenal & permanen (perbaikan konfigurasi, bukan retry). */
  permanent: boolean;
}

/**
 * Kode error Meta yang PERMANEN — percobaan ulang hanya membuang kuota
 * dan menunda kejelasan; harus diperbaiki lewat konfigurasi/akun Meta.
 * 131031 = Business Account locked (kasus acuan demo).
 */
const PERMANENT_META_CODES: Record<number, string> = {
  131031: 'Business Account Meta terkunci/locked',
  190: 'Access token tidak valid/kedaluwarsa',
  100: 'Parameter permintaan tidak valid',
  131026: 'Gateway Meta menolak pengiriman pesan',
  131047: 'pengguna belum menerima pesan — jendela re-engagement terlewat',
  131056: 'Akun kena kebijakan anti-spam Meta',
  368: 'Akun diblokir sementara karena trafik tidak wajar',
};

/**
 * Kelaskan error Graph API dari respons HTTP non-2xx.
 * - Pesan error Meta DISANITASI: rentetan ≥9 digit (nomor penerima) dimasking
 *   — pesan error kadang memuat nomor; token TIDAK PERNAH ikut (header
 *   Authorization tidak pernah dibaca ke string).
 * - Retry hanya untuk galat jaringan (HTTP 5xx/429) TANPA kode permanen.
 *   Kode permanen (mis. 131031) → retryable=false → outbox langsung `failed`
 *   dan tercatat jujur di riwayat admin.
 * Diekspor untuk pengujian unit tanpa HTTP.
 */
export function classifyMetaError(input: {
  httpStatus: number;
  body?: unknown;
  rawText?: string;
}): MetaErrorInfo {
  const { httpStatus, body, rawText } = input;
  const err =
    body && typeof body === 'object' && typeof (body as any).error === 'object'
      ? ((body as any).error as Record<string, unknown>)
      : undefined;

  const code = typeof err?.code === 'number' ? (err.code as number) : undefined;
  const subcode = typeof err?.error_subcode === 'number' ? (err.error_subcode as number) : undefined;

  const rawMsg =
    typeof err?.message === 'string' && err.message
      ? err.message
      : rawText && rawText.length < 300
        ? rawText
        : '';
  const safeMsg = maskDigitRuns(String(rawMsg).replace(/\s+/g, ' ').trim()).slice(0, 300);

  const known = code !== undefined ? PERMANENT_META_CODES[code] : undefined;
  const permanent = known !== undefined;
  const networkish = httpStatus >= 500 || httpStatus === 429;
  const retryable = permanent ? false : networkish;

  const parts: string[] = [`Graph API ${httpStatus}`];
  if (code !== undefined) {
    parts.push(permanent ? `Meta ${code} (${known})` : `code ${code}`);
  }
  if (subcode !== undefined) parts.push(`subcode ${subcode}`);
  const head = parts.join(' · ');
  const safeMessage = safeMsg ? `${head}: ${safeMsg}` : head;

  return { safeMessage: safeMessage.slice(0, 500), code, subcode, retryable, permanent };
}

interface SendInput {
  to: string; // E.164 tanpa "+", contoh: 6281234567890
  templateName: string;
  params: string[];
}

function graphUrl(config: WhatsappConfig): string {
  return `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
}

/** Susun body permintaan template (diekspor untuk pengujian unit tanpa HTTP). */
export function buildTemplateRequestBody(input: SendInput) {
  return {
    messaging_product: 'whatsapp' as const,
    to: input.to,
    type: 'template' as const,
    template: {
      name: input.templateName,
      language: { code: 'id' },
      components: [
        {
          type: 'body',
          parameters: input.params.map((text) => ({ type: 'text', text })),
        },
      ],
    },
  };
}

/**
 * Kirim template resmi. Hidup di balik seluruh validasi `getLiveConfig()`
 * sehingga tidak mungkin terpanggil dengan mode simulation/kredensial invalid.
 */
export async function sendTemplateMessage(input: SendInput): Promise<SendResult> {
  const cfg = getLiveConfig();
  if (!cfg.ok) return { ok: false, error: cfg.reason, retryable: false };

  const { config } = cfg;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let timedOut = false;
  try {
    const res = await fetch(graphUrl(config), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildTemplateRequestBody(input)),
      signal: controller.signal,
    });

    const raw = await res.text().catch(() => '');
    let parsed: any = null;
    try {
      parsed = raw ? JSON.parse(raw) : null;
    } catch {
      parsed = null;
    }

    if (res.ok) {
      const messageId = parsed?.messages?.[0]?.id;
      return { ok: true, messageId: typeof messageId === 'string' ? messageId : undefined };
    }

    // Hanya pesan error dari Meta yang disimpan (tanpa header/token apa pun);
    // dinormalisasi + disanitasi lewat classifyMetaError (nomor dimasking,
    // kode permanen seperti 131031 diberi label & TIDAK diretry).
    const info = classifyMetaError({ httpStatus: res.status, body: parsed, rawText: raw });
    return {
      ok: false,
      error: info.safeMessage,
      retryable: info.retryable,
    };
  } catch (e: any) {
    timedOut = e?.name === 'AbortError';
    if (timedOut) {
      // Timeout = status tak diketahui — JANGAN retry otomatis (mencegah kiriman ganda).
      return { ok: false, error: 'Timeout 15s — status pengiriman tidak diketahui; tidak dicoba ulang.', retryable: false };
    }
    // Error level jaringan sebelum permintaan terkirim → boleh retry terbatas.
    return { ok: false, error: 'Gagal menghubungi Graph API (jaringan).', retryable: true };
  } finally {
    clearTimeout(timer);
  }
}
