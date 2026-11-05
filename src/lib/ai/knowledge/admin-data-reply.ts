/**
 * ============================================================================
 * knowledge/admin-data-reply.ts — Jawaban Data Admin untuk USER (Bukan SYSTEM)
 * ============================================================================
 *
 * Blok konteks tool (tools.ts) memakai penanda internal `[TITLE — SUMBER:
 * DATABASE ITSM ...]` / `[AKHIR TITLE]` yang SAH disuntikkan sebagai pesan
 * SYSTEM (anti prompt-injection), tetapi TIDAK boleh tampil ke user.
 *
 * Modul ini mentransformasi blok tersebut menjadi jawaban tampilan yang rapi:
 *   - Penanda internal dihapus, judul menjadi heading Markdown natural.
 *   - Baris "Catatan: ..." menjadi catatan kaki italic.
 *   - Placeholder [REDACTED] (hasil sanitasi PII) tidak tampil mentah.
 *   - TANPA mengubah angka/data apa pun — murni format.
 *
 * Dipakai di pipeline.ts untuk:
 *   (a) jawaban deterministik langsung (intent data sederhana, tanpa provider),
 *   (b) fallback saat provider NVIDIA tidak tersedia.
 * ============================================================================
 */

import type { AdminRouterOutput } from './router';

/** Baris pembuka blok: [JUDUL — SUMBER: DATABASE ITSM (data sistem, ...)] */
const MARKER_HEADER = /^\[([^\]]+?)\s+—\s+SUMBER:\s+DATABASE ITSM[^\]]*\]$/;
/** Baris penutup: [AKHIR JUDUL] */
const MARKER_END = /^\[AKHIR\s+[^\]]+\]$/;
/** Penanda pemangkasan konteks: [... DIPOTONG — BATAS KONTEKS ...] */
const MARKER_CUT = /^\[\.\.\.[^\]]*\]$/;

const SMALL_WORDS = new Set(['per', 'dan', 'vs', 'untuk', 'dari', 'di', 'ke', 'dengan', 'yang', 'ini']);

/** "STATISTIK PESANAN PER STATUS" -> "Statistik Pesanan per Status" */
function titleCase(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/** Pembuka alami per intent — menjawab pertanyaan sesuai konteksnya. */
const INTRO_BY_INTENT: Record<string, string> = {
  order_count: 'Berikut jumlah pesanan dari database sistem:',
  recent_orders: 'Berikut daftar pesanan terbaru dari database sistem:',
  order_stats: 'Berikut ringkasan pesanan dari database sistem:',
  customer_stats: 'Berikut statistik customer dari database sistem:',
  top_services: 'Berikut layanan terpopuler dari database sistem:',
  inventory_summary: 'Berikut ringkasan inventaris dari database sistem:',
  revenue_summary: 'Berikut ringkasan finansial dari database sistem:',
  weekly_report: 'Berikut ringkasan laporan mingguan dari database sistem:',
  monthly_report: 'Berikut ringkasan laporan bulanan dari database sistem:',
  status_history: 'Berikut riwayat/status progres pesanan dari database sistem:',
  service_duration: 'Berikut ringkasan durasi proses servis dari database sistem:',
};

const DEFAULT_INTRO = 'Berikut datanya dari database sistem (read-only):';

/**
 * Konversi blok konteks tool menjadi teks tampilan user-facing yang bersih.
 * - Menghapus SEMUA penanda internal (header/akhir/pemangkas).
 * - Judul blok menjadi heading Markdown `### Judul Natural`.
 * - Baris "Catatan: ..." dikumpulkan sebagai catatan kaki italic.
 * - Placeholder [REDACTED] tidak pernah tampil mentah.
 * - Angka dan isi data TIDAK diubah.
 */
export function toUserFacingDataText(block: string): string {
  if (!block || !block.trim()) return '';

  const body: string[] = [];
  const notes: string[] = [];

  for (const raw of block.split('\n')) {
    const line = raw.trim();

    if (!line) {
      if (body.length > 0 && body[body.length - 1] !== '') body.push('');
      continue;
    }

    const header = line.match(MARKER_HEADER);
    if (header) {
      if (body.length > 0) body.push('');
      body.push(`### ${titleCase(header[1])}`);
      continue;
    }

    if (MARKER_END.test(line) || MARKER_CUT.test(line)) continue;

    if (/^Catatan:/.test(line)) {
      notes.push(line.replace(/^Catatan:\s*/, '').trim());
      continue;
    }

    body.push(line);
  }

  let text = body
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    // Bersihkan placeholder hasil sanitasi PII agar tidak terlihat seperti debug.
    .replace(/\s*\(\[REDACTED\]\)/g, '')
    .replace(/\[REDACTED\]/g, '—')
    .trim();

  const noteLines = notes.filter(Boolean).map((n) => `*Catatan: ${n}*`);
  if (noteLines.length > 0) {
    text = [text, ...noteLines].join('\n\n');
  }

  return text;
}

/**
 * Bangun jawaban tampilan lengkap dari meta router + blok konteks.
 * Mengembalikan null bila blok kosong (tidak ada data untuk dijawab).
 */
export function buildAdminDataReply(
  meta: AdminRouterOutput['meta'],
  rawBlock: string
): string | null {
  const body = toUserFacingDataText(rawBlock);
  if (!body) return null;

  const intro = INTRO_BY_INTENT[meta.intent] ?? DEFAULT_INTRO;
  return [intro, '', body].join('\n');
}
