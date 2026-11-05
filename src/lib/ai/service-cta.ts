/**
 * ============================================================================
 * service-cta.ts — Kebijakan relevansi CTA "Buat pesanan service"
 * ============================================================================
 *
 * SATU sumber kebijakan untuk chatbot publik (HomeChatbot) dan dashboard
 * (MikoChat): CTA layanan hanya boleh muncul bila balasan AI
 * benar-benar terkait masalah servis / diagnosis kerusakan — BUKAN pada:
 *   - sapaan & pesan sambutan,
 *   - pertanyaan identitas (developer / user / AI),
 *   - informasi umum & katalog harga,
 *   - penolakan tugas (scope-restriction),
 *   - balasan clarify ("belum menangkap masalah teknis"),
 *   - guard privasi publik.
 *
 * Sinyal relevansi (urut):
 *   1) recommendedService terisi  → relevan (sinyal kuat dari AI),
 *   2) provider deterministik/guard/scope → TIDAK relevan,
 *   3) penanda diagnosis servis pada isi jawaban → relevan,
 *   4) selain itu → TIDAK relevan (default tertutup; mencegah CTA liar).
 * ============================================================================
 */

/** Provider yang secara definisi TIDAK terkait masalah servis. */
const NON_SERVICE_PROVIDERS = [
  'scope-restriction',
  'public-identity-guard',
  'public-privacy-guard',
  'deterministic-developer-identity',
  'deterministic-user-identity',
  'deterministic-order-status',
  'deterministic-catalog',
];

/** Balasan yang jelas bukan diagnosis (ditolak / clarify / identitas developer). */
const NEGATIVE_CONTENT = [
  /belum menangkap masalah teknis/i, // clarify umum ExpertEngine
  /mengerjakan tugas|tidak dapat membantu membuat kode/i, // penolakan tugas
  /dikembangkan oleh/i, // jawaban identitas pengembang
];

/** Penanda diagnosis / masalah servis yang sah menampilkan CTA. */
const SERVICE_MARKERS =
  /(kemungkinan penyebab|penyebab umum|disclaimer|buat pesanan service|perlu penanganan teknisi|langkah troubleshooting|solusi (awal|pertama|untuk)|rekomendasi (layanan|servis)|perbaikan fisik|inspeksi teknis)|⚠️/i;

export function isServiceRelevantReply(
  content: string,
  provider?: string | null,
  recommendedService?: string | null
): boolean {
  if (recommendedService) return true;
  if (provider) {
    if (NON_SERVICE_PROVIDERS.includes(provider)) return false;
    if (provider.startsWith('public-') || provider.startsWith('deterministic-')) return false;
  }
  const text = content || '';
  if (!text) return false;
  if (NEGATIVE_CONTENT.some((re) => re.test(text))) return false;
  return SERVICE_MARKERS.test(text);
}
