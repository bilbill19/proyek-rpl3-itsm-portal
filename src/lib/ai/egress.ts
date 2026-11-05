/**
 * ============================================================================
 * egress.ts — Sanitizer DATA EGRESS ke provider AI EKSTERNAL (NVIDIA NIM)
 * ============================================================================
 *
 * AI Smart Diagnostic sekarang mengirim riwayat + konteks pesanan ke NVIDIA
 * (provider eksternal). Sebelum dikirim, teks dibersihkan dari data sensitif:
 *   - API key / token (nvapi-..., Bearer ..., label password/token/api key)
 *   - Alamat email
 *   - Nomor telepon Indonesia (08xx / +628xx)
 *
 * Prinsip:
 *   - Hanya berlaku saat OUTBOUND (salinan yang dikirim ke provider).
 *     Data yang tersimpan di database TIDAK pernah diubah.
 *   - Nama pelanggan/alamat tidak bisa diandalkan lewat regex → tidak pernah
 *     dimasukkan ke blok konteks sejak awal (lihat getOrderContextBlock yang
 *     hanya memilih tiket/layanan/perangkat/status/biaya/deskripsi masalah).
 *   - Modul ini TIDAK mengimpor apa pun (aman di-unit-test langsung oleh Node).
 *
 * Dipakai di: src/lib/ai/index.ts → generateDiagnosticResponse()
 * (chatbot publik /api/ai/chat TIDAK lewat jalur ini — tidak berubah).
 * ============================================================================
 */

const REDACTED = '[REDACTED]';

/** Pasangan [pola, pengganti] — dijalankan berurutan pada teks outbound. */
const PATTERNS: Array<[RegExp, string]> = [
  // API key format NVIDIA (nvapi-...)
  [/nvapi-[A-Za-z0-9_-]{6,}/g, REDACTED],
  // Bearer token
  [/\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, REDACTED],
  // Label rahasia diikuti nilai: password: xxx, token=xxx, api key: xxx, dll.
  [
    /\b(?:password|passwd|kata\s+sandi|token|api[\s_-]*key|secret|authorization)\s*[:=]\s*[^\s,;]{4,}/gi,
    REDACTED,
  ],
  // Alamat email
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, REDACTED],
  // Nomor telepon Indonesia: 08xx (9-13 digit) atau +628xx — lookbehind
  // mencegah angka di tengah (mis. kode tiket ITSM-202608-0001) terkena.
  [/(?<![\d.])(?:\+?62|0)8[0-9]{7,12}\b/g, REDACTED],
];

/**
 * Bersihkan teks yang akan DIKIRIM ke provider AI eksternal.
 * Mengembalikan salinan bersih; input tidak dimodifikasi.
 */
export function sanitizeOutboundText(text: string): string {
  if (!text) return text;
  let out = text;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
