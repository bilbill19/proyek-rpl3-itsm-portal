/**
 * ============================================================================
 * knowledge/router.ts — Intent Router AI Admin (Rule-Based, Deterministic)
 * ============================================================================
 *
 * Mengklasifikasikan pertanyaan user ke intent terstruktur, lalu memetakan
 * ke tool yang sesuai. Berbasis aturan (regex/keyword) — bukan LLM —
 * sehingga cepat, deterministik, dan tidak memakan kuota NVIDIA.
 *
 * Role binding: tool hanya dieksekusi jika role user cocok `tool.roles`.
 * PUBLIC/CUSTOMER tidak pernah sampai ke sini (dihandle route terpisah).
 * ============================================================================
 */

import { z } from 'zod';
import type { ToolDefinition, ToolResult, UserRole } from './tools';
import { adminTools, getAdminTool, assertRoleAllowed } from './tools';

/* -------------------------------------------------------------------------- */
/* Tipe Hasil Router                                                          */
/* -------------------------------------------------------------------------- */

export type AdminIntent =
  | 'order_count'
  | 'customer_stats'
  | 'order_stats'
  | 'recent_orders'
  | 'top_services'
  | 'inventory_summary'
  | 'revenue_summary'
  | 'weekly_report'
  | 'monthly_report'
  | 'status_history'
  | 'service_duration'
  | 'unknown';

export interface RouterResult {
  intent: AdminIntent;
  toolName: string | null;
  input: Record<string, unknown>;
  confidence: number; // 0-1
  reason: string;
}

/* -------------------------------------------------------------------------- */
/* Fragmen Kata Kunci Kelompok Status (dipakai BERSAMA oleh pola intent dan    */
/* extractOrderStatusGroup sehingga definisinya tidak pernah menyimpang)       */
/* -------------------------------------------------------------------------- */

const SG_APPROVAL = String.raw`(?:menunggu\s+(?:persetujuan|approval)|pending\s+(?:approval|persetujuan)|persetujuan|approval)`;
const SG_NEW = String.raw`(?:baru|masuk\s+(?:baru|tadi)|barusan|terbaru|terakhir)`;
const SG_DONE = String.raw`(?:sudah\s+|telah\s+)?(?:selesai|tuntas|diselesaikan|completed|done)`;
const SG_INPROG = String.raw`(?:dalam\s+proses|dalam\s+pengerjaan|proses\s+pengerjaan|sedang\s+diproses|sedang\s+dikerjakan|sedang\s+diperbaiki|sedang\s+ditangani|diproses|dikerjakan|diperbaiki|ditangani|in\s+progress)`;
const SG_ANY = `(?:${SG_APPROVAL}|${SG_NEW}|${SG_DONE}|${SG_INPROG})`;

/**
 * Sinonim kata benda "pesanan" (bahasa sehari-hari Admin): pesanan, order,
 * tiket, service, servis. Dipakai pola intent order_count agar Admin boleh
 * bertanya "Total service ada berapa?" tanpa harus menghafal kata "pesanan".
 */
const SG_ORDER = String.raw`(?:pesanan|orders?|tiket|service|servis)`;

/* -------------------------------------------------------------------------- */
/* Pola Kata Kunci per Intent                                                 */
/* -------------------------------------------------------------------------- */

const INTENT_PATTERNS: Array<{ intent: AdminIntent; patterns: RegExp[]; toolName: string }> = [
  {
    // ── JUMLAH pesanan (angka hasil COUNT database) — DIMULAI PALING AWAL ──
    // Pertanyaan hitungan wajib menghasilkan ANGKA dari tool order_count, dan
    // TIDAK PERNAH jatuh ke intent daftar (recent_orders) / ringkasan
    // (order_stats) / provider generatif / balasan penutup percakapan.
    // Skor intent ini juga diberi boost +0.1 di routeAdminIntent sehingga
    // selalu menang bila seri.
    intent: 'order_count',
    toolName: 'order_count',
    patterns: [
      // — Jumlah BARU (status CREATED — sama dengan kartu "Pesanan Baru" /admin/dashboard)
      /\b(ada\s+)?berapa\s+(jumlah\s+)?(pesanan|order|tiket)\s+(yang\s+)?(baru|masuk\s+(baru|tadi)|barusan)\b/i,
      /\bjumlah\s+(pesanan|order|tiket)\s+(yang\s+)?(baru|masuk)\b/i,
      /\bberapa\s+(jumlah\s+)?(pesanan|order|tiket)\s+(terbaru|terakhir)\b/i,
      /\b(pesanan|order|tiket)\s+(yang\s+)?(paling\s+)?(terbaru|terakhir|baru)\s*(ada\s+)?berapa\b/i,
      // — Jumlah DALAM PROSES — variasi: "dalam proses", "diproses",
      //   "sedang dikerjakan", "proses pengerjaan", "in progress".
      //   Sinyal hitungan & status bisa muncul urut apa saja dalam kalimat.
      //   Varian ejaan terpisah ("di proses", "lagi ditangani") sudah
      //   diseragamkan lebih dulu oleh normalizeOperationalQuery.
      /\b(ada\s+)?berapa\b[^.?!]*\b(dalam\s+proses|dalam\s+pengerjaan|proses\s+pengerjaan|sedang\s+diproses|sedang\s+dikerjakan|sedang\s+diperbaiki|sedang\s+ditangani|diproses|dikerjakan|diperbaiki|ditangani|in\s+progress)\b/i,
      /\b(dalam\s+proses|dalam\s+pengerjaan|proses\s+pengerjaan|sedang\s+diproses|sedang\s+dikerjakan|sedang\s+diperbaiki|sedang\s+ditangani|diproses|dikerjakan|diperbaiki|ditangani|in\s+progress)\b[^.?!]*\b(berapa|jumlah)\b/i,
      /\bjumlah\s+(pesanan|order|tiket)?\s*(yang\s+)?(dalam\s+proses|dalam\s+pengerjaan|proses\s+pengerjaan|sedang\s+diproses|sedang\s+dikerjakan|sedang\s+ditangani)\b/i,
      // — Jumlah SELESAI (kartu "Service Selesai" = COMPLETED/DELIVERED)
      /\b(ada\s+)?berapa\s+(jumlah\s+)?(pesanan|order|tiket)\s+(yang\s+)?(sudah\s+|telah\s+)?(selesai|tuntas|diselesaikan)\b/i,
      /\bjumlah\s+(pesanan|order|tiket)\s+(yang\s+)?(sudah\s+|telah\s+)?selesai\b/i,
      // — Jumlah MENUNGGU PERSETUJUAN (kartu "Menunggu Persetujuan") —
      //   termasuk tanpa kata "pesanan" ("Berapa yang menunggu persetujuan?").
      /\b(ada\s+)?berapa\s+(jumlah\s+)?(pesanan|order|tiket)\s+(yang\s+)?(menunggu\s+)?(persetujuan|approval)\b/i,
      /\b(ada\s+)?berapa\s+(yang\s+)?(menunggu\s+)?(persetujuan|approval)\b/i,
      // — Pertanyaan LANJUTAN konteks ("Kalau yang sedang diproses?",
      //   "Kalau yang selesai?", "Yang menunggu persetujuan?") — TANPA kata
      //   "berapa" di depan; kelompok status diekstrak dari katanya sendiri.
      //   Tanpa pola ini, follow-up begitu jatuh ke provider/fallback dan
      //   salah dijawab sapaan penutup percakapan.
      /\b(kalo|kalau)\s+(yang\s+)?(dalam\s+proses|dalam\s+pengerjaan|proses\s+pengerjaan|sedang\s+diproses|sedang\s+dikerjakan|sedang\s+diperbaiki|sedang\s+ditangani|diproses|dikerjakan|diperbaiki|ditangani|in\s+progress)\b/i,
      /\b(kalo|kalau)\s+(yang\s+)?(sudah\s+|telah\s+)?(selesai|tuntas|diselesaikan)\b/i,
      /\b(kalo|kalau)\s+(yang\s+)?(menunggu\s+)?(persetujuan|approval)\b/i,
      /\b(kalo|kalau)\s+(yang\s+)?(baru|masuk)\b/i,
      /^yang\s+(dalam\s+proses|dalam\s+pengerjaan|proses\s+pengerjaan|sedang\s+diproses|sedang\s+dikerjakan|sedang\s+diperbaiki|sedang\s+ditangani|diproses|dikerjakan|diperbaiki|ditangani)\s*(lalu|tadi)?\s*\??$/i,
      /^yang\s+(sudah\s+|telah\s+)?(selesai|tuntas|diselesaikan)\s*(lalu|tadi)?\s*\??$/i,
      /^yang\s+(menunggu\s+)?(persetujuan|approval)\s*\??$/i,
      // — Pola GENERIK per kelompok status (bug P0: kalimat dengan urutan
      //   TERBALIK tanpa kata "pesanan"). Sinyal hitungan ("ada berapa")
      //   boleh muncul SESUDAH kelompok status:
      //     "Yang menunggu persetujuan ada berapa?" / "Yang selesai ada
      //     berapa?" / "Yang baru ada berapa?" / "Yang sedang diproses ada
      //     berapa?" — semua wajib terjawab ANGKA COUNT, bukan ExpertEngine.
      new RegExp(String.raw`\byang\s+${SG_ANY}\b[^.?!]*\b(ada\s+)?berapa\b`, 'i'),
      // — Pola GENERIK urutan normal + varian Inggris "pending approval":
      //     "Ada berapa yang pending approval?" / "Berapa yang selesai?"
      new RegExp(String.raw`\b(ada\s+)?berapa\s+(yang\s+)?${SG_ANY}\b`, 'i'),
      // — Varian singkat TANPA kata "berapa" (jawaban tetap angka COUNT):
      //     "Yang baru?" (pola telanjang; varian progres/selesai/persetujuan
      //     telanjang sudah punya pola anchor tersendiri di atas)
      new RegExp(String.raw`^yang\s+(?:${SG_NEW})\s*(?:lalu|tadi|saja)?\s*\??$`, 'i'),
      // — Follow-up lanjutan di luar kata "kalau" ("Terus yang sedang
      //   diproses?", "Lalu yang selesai?") — tetap terjawab angka COUNT
      //   tanpa perlu konteks, konsisten dengan pola "kalau ..." di atas.
      new RegExp(String.raw`\b(terus|lanjut|lalu|gimana\s+dengan|bagaimana\s+dengan)\s+(yang\s+)?${SG_ANY}\b`, 'i'),
      // — Pola GENERIK bebas urutan dengan sinonim "service/servis" dan
      //   sinyal hitungan "berapakah". Menutup bug P0 terbaru
      //   "total service yang sudah selesai ada berapa?" plus varian:
      //   "Service selesai ada berapa?" / "Total service pending approval
      //   berapa?" / "Pesanan selesai ada berapa?" (status → sinyal hitung).
      new RegExp(
        String.raw`\b${SG_ANY}\b(?!\s*(?:lama|waktu|biaya))[^.?!]*\b(ada\s+)?(berapakah|berapa)\b`,
        'i'
      ),
      // — Sinyal hitung di depan + kata benda pesanan (sinonim) + status:
      //     "Berapa total service yang sedang di proses?" /
      //     "Berapa service yang sudah selesai?" / "Berapa tiket baru?"
      new RegExp(
        String.raw`\b(ada\s+)?(berapakah|berapa)\s+(jumlah\s+|total\s+|seluruh\s+|semua\s+)*${SG_ORDER}\s+(yang\s+)?${SG_ANY}\b`,
        'i'
      ),
      // — TOTAL dengan sinonim "service/servis" tanpa kata "berapa" di depan
      //     "Total service ada berapa?" / "Jumlah order semuanya berapa?" /
      //     "Total service baru ada berapa?" (grup status tetap diekstrak:
      //     → NEW).
      new RegExp(
        String.raw`\b(total|jumlah|seluruh|semua)\s+(jumlah\s+|total\s+|seluruh\s+|semua\s+)*${SG_ORDER}\b`,
        'i'
      ),
      // — Kata benda pesanan menyusul status ("Pesanan baru ada berapa?",
      //   "Tiket selesai ada berapa?" — pola generik tanpa syarat "yang")
      new RegExp(
        String.raw`\b${SG_ORDER}\s+(yang\s+)?(paling\s+)?(terbaru|terakhir|baru)\s*(ada\s+)?(berapakah|berapa)\b`,
        'i'
      ),
      // — TOTAL / SELURUH (tanpa kualifikator status apa pun)
      /\b(ada\s+)?berapa\s+(jumlah\s+|total\s+|seluruh\s+|semua\s+)*(pesanan|order|tiket)\s*\??$/i,
      /\b(ada\s+)?berapa\s+(total|jumlah)\s+(jumlah\s+|seluruh\s+|semua\s+)*(pesanan|order|tiket)\b/i,
      /\b(total|jumlah|seluruh|semua)\s+(jumlah\s+|seluruh\s+|semua\s+)?(pesanan|order|tiket)(?!\s*(yang\s+)?(baru|masuk|terbaru|terakhir|dalam|sedang|sudah|selesai|menunggu))/i,
    ],
  },
  {
    // Pesanan terbaru (daftar nomor tiket + status) — pertanyaan data operasional
    // sederhana yang wajib dijawab dari database, BUKAN dari respons generatif.
    // CATATAN: pola "(berapa )?pesanan ... baru" TIDAK lagi memakai prefix
    // "berapa" — pertanyaan hitungan "Ada berapa pesanan baru?" harus masuk
    // intent order_count (jumlah), bukan recent_orders (daftar).
    intent: 'recent_orders',
    toolName: 'recent_orders',
    patterns: [
      /\b(pesanan|order|tiket|invoice)\s+(terbaru|terakhir|terkini|paling\s+baru)\b/i,
      /\b(terbaru|terakhir|terkini)\s+(pesanan|order|tiket)\b/i,
      /\b(sebutkan|tampilkan|lihat|daftar|list|tunjukkan)\s+\d{0,2}\s*(pesanan|order|tiket)\b/i,
      /\b(pesanan|order|tiket)\s+(yang\s+)?(paling\s+)?baru\b/i,
      /\b(\d{1,2}|satu|dua|tiga|empat|lima|beberapa|few|latest)\s+(pesanan|order|tiket)\b/i,
      /\bstatus\s+\d{0,2}\s*(pesanan|order|tiket)?\s*(terakhir|terbaru)\b/i,
    ],
  },
  {
    intent: 'customer_stats',
    toolName: 'customer_stats',
    patterns: [
      /\b(total|jumlah|berapa)\s+(customer|pelanggan)\b/i,
      /\b(customer|pelanggan)\s+(baru|aktif|statistik|ringkasan)\b/i,
      /\brata-?rata\s+(belanja|pengeluaran|spend)\s+(per\s+)?(customer|pelanggan)\b/i,
      /\bdaftar\s+(customer|pelanggan)\b/i,
    ],
  },
  {
    intent: 'order_stats',
    toolName: 'order_stats',
    patterns: [
      /\b(total|jumlah|berapa)\s+(pesanan|order|tiket)\b/i,
      /\bpesanan\s+(per\s+)?status\b/i,
      /\bdistribusi\s+status\s+pesanan\b/i,
      /\btren\s+(pesanan|order)\b/i,
      /\b(harian|mingguan|bulanan)\s+(pesanan|order)\b/i,
      // Tambahan: statistik, statistik pesanan, statistik order
      /\bstatistik\s+(pesanan|order|tiket)\b/i,
      /\bstatistik\s+(pesanan|order|tiket)\s+(bulan|minggu|hari|ini)\b/i,
      /\bstatistik\s+(bulan|minggu|hari)\s+(ini|ini\s+pesanan|ini\s+order)\b/i,
    ],
  },
  {
    intent: 'top_services',
    toolName: 'top_services',
    patterns: [
      /\b(layanan|service)\s+(terpopuler|paling\s+banyak|top|favorit)\b/i,
      /\b(layanan|service)\s+yang\s+paling\s+sering\s+dipesan\b/i,
      /\btop\s+\d*\s*(layanan|service)\b/i,
    ],
  },
  {
    intent: 'inventory_summary',
    toolName: 'inventory_summary',
    patterns: [
      /\b(inventaris|inventory|stok|sparepart|komponen)\s+(ringkasan|summary|statistik|total)\b/i,
      /\bstok\s+(menipis|habis|low|out\s*of\s*stock)\b/i,
      /\bstoknya\s+(menipis|habis)\b/i,
      /\binventory\s+(stok\s+)?(menipis|habis|low|out\s*of\s*stock)\b/i,
      /\bvaluasi\s+(stok|inventaris)\b/i,
      /\btotal\s+(item|stok)\s+(inventaris|inventory)\b/i,
    ],
  },
  {
    intent: 'revenue_summary',
    toolName: 'revenue_summary',
    patterns: [
      /\b(pendapatan|revenue|finansial|keuangan)\s+(ringkasan|summary|statistik)\b/i,
      /\btotal\s+(biaya\s+final|final\s+price)\b/i,
      /\b(total\s+)?estimasi\s+(vs|versus|dan)\s+(final|biaya\s+akhir)\b/i,
      /\bmargin\s+(estimasi|final)\b/i,
      /\bringkasan\s+(nilai|nilai\s+servis|finansial)\b/i,
      /\bnilai\s+servis\b/i,
      // — Pertanyaan "berapa pendapatan …" (termasuk difilter status
      //   "selesai"), mis. "Berapa pendapatan dari servis yang selesai?".
      //   Aman dari bentrok dengan order_count: order_count butuh objek
      //   pesanan/order/tiket — kata "pendapatan" tidak pernah tertangkap
      //   di intent tersebut, sehingga revenue menang bersih.
      /\bberapa\s+(pendapatan|revenue)\b/i,
      /\b(pendapatan|revenue)\s+(dari\s+)?(servis|service|perbaikan)\b/i,
      /\b(pendapatan|revenue)\b[^.?!]*\b(selesai|tuntas|diselesaikan|completed|delivered)\b/i,
    ],
  },
  {
    intent: 'status_history',
    toolName: 'order_stats',
    patterns: [
      /\b(riwayat|history)\s+(status|progres|progres)\b/i,
      /\bstatus\s+(perubahan|perubahan|berubah)\b/i,
      /\bprogres\s+pesanan\b/i,
      /\bprogres\s+servis\b/i,
    ],
  },
  {
    intent: 'service_duration',
    toolName: 'order_stats',
    patterns: [
      /\b(rata-?rata|average)\s+(waktu|durasi|lama)\s+(servis|proses|perbaikan)\b/i,
      /\blama\s+(servis|proses|perbaikan)\b/i,
      /\bdurasi\s+(servis|proses|perbaikan)\b/i,
    ],
  },
  {
    intent: 'weekly_report',
    toolName: 'order_stats',
    patterns: [
      /\blaporan\s+mingguan\b/i,
      /\bminggu\s+ini\s+(pesanan|order)\b/i,
      /\bweekly\s+report\b/i,
    ],
  },
  {
    intent: 'monthly_report',
    toolName: 'order_stats',
    patterns: [
      /\blaporan\s+bulanan\b/i,
      /\bbulan\s+ini\s+(pesanan|order)\b/i,
      /\bmonthly\s+report\b/i,
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Ekstraksi Parameter dari Query                                             */
/* -------------------------------------------------------------------------- */

function extractDays(text: string, defaultDays: number = 30): number {
  // Cari pola "X hari", "X minggu", "X bulan", "last X days"
  const m = text.match(/\b(\d{1,3})\s*(hari|minggu|bulan|days?|weeks?|months?)\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    if (unit.startsWith('h') || unit.startsWith('d')) return Math.min(n, 90);
    if (unit.startsWith('m') || unit.startsWith('w')) return Math.min(n * 7, 90);
    if (unit.startsWith('b')) return Math.min(n * 30, 365);
  }
  // "minggu ini" / "bulan ini"
  if (/\b(minggu|week)\s+ini\b/i.test(text)) return 7;
  if (/\b(bulan|month)\s+ini\b/i.test(text)) return 30;
  return defaultDays;
}

function extractTake(text: string, defaultTake: number = 10): number {
  const m = text.match(/\b(top|first|pertama)\s+(\d{1,2})\b/i);
  if (m) return Math.min(parseInt(m[2], 10), 20);
  return defaultTake;
}

/**
 * Jumlah pesanan/tiket yang diminta user ("3 pesanan terbaru", "5 tiket terakhir").
 * Default 5 bila tidak disebutkan; selalu dibatasi 1..10 (tak ada list tak terbatas).
 */
function extractRecentCount(text: string, defaultCount: number = 5): number {
  const numWords: Record<string, number> = {
    satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
    enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
  };
  const digits = text.match(/\b(\d{1,2})\s+(?:pesanan|order|tiket|invoice)\b/i);
  if (digits) return Math.min(Math.max(parseInt(digits[1], 10), 1), 10);
  const words = text.match(/\b(satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s+(?:pesanan|order|tiket|invoice)\b/i);
  if (words) return numWords[words[1].toLowerCase()] ?? defaultCount;
  return defaultCount;
}

function extractStockStatus(text: string): 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
  if (/\b(habis|out\s*of\s*stock|kosong)\b/i.test(text)) return 'OUT_OF_STOCK';
  if (/\b(menipis|low\s*stock|minim)\b/i.test(text)) return 'LOW_STOCK';
  if (/\b(aman|in\s*stock|tersedia)\b/i.test(text)) return 'IN_STOCK';
  return 'ALL';
}

function extractGroupBy(text: string): 'status' | 'daily' | 'weekly' | 'monthly' {
  if (/\b(harian|daily)\b/i.test(text)) return 'daily';
  if (/\b(mingguan|weekly|per\s+minggu)\b/i.test(text)) return 'weekly';
  if (/\b(bulanan|monthly|per\s+bulan)\b/i.test(text)) return 'monthly';
  return 'status';
}

function extractStatusFilter(text: string): 'ALL' | 'ACTIVE' | 'HAS_ORDERS' | 'NO_ORDERS' {
  if (/\b(aktif|active)\b/i.test(text)) return 'ACTIVE';
  if (/\b(punya\s+pesanan|has\s+orders?)\b/i.test(text)) return 'HAS_ORDERS';
  if (/\b(tanpa\s+pesanan|no\s+orders?)\b/i.test(text)) return 'NO_ORDERS';
  return 'ALL';
}

type OrderCountStatusGroup = 'NEW' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED' | 'ALL';

/**
 * Normalisasi query operasional — menyamakan varian ejaan bahasa Indonesia
 * yang sering ditulis terpisah/berubah bentuk agar KONSISTEN dengan kosakata
 * pola intent di bawah: "di proses" → "diproses", "lagi diproses" →
 * "sedang diproses", "di kerjakan" → "dikerjakan", dst.
 * Basis bug: "berapa jumlah yang sedang di proses?" (dengan spasi "di proses")
 * tidak tertangkap pola mana pun → intent unknown → provider generatif
 * menjawab di luar konteks / pesan penutup percakapan.
 * Tanda baca TIDAK diubah (pola memakai [^.?!]* dan anchor $).
 */
function normalizeOperationalQuery(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\bdi\s+(proses|diproses)\b/g, 'diproses')
    .replace(/\bdi\s+(kerjakan|dikerjakan)\b/g, 'dikerjakan')
    .replace(/\bdi\s+(perbaiki|diperbaiki)\b/g, 'diperbaiki')
    .replace(/\bdi\s+(tangani|ditangani)\b/g, 'ditangani')
    .replace(/\b(sedang|lagi|masih|masi)\s+proses\b/g, '$1 diproses')
    .replace(/\b(lagi|masih|masi)\s+diproses\b/g, 'sedang diproses')
    .replace(/\b(lagi|masih|masi)\s+dikerjakan\b/g, 'sedang dikerjakan')
    .replace(/\b(lagi|masih|masi)\s+ditangani\b/g, 'sedang ditangani');
}

/**
 * Kelompok status untuk intent order_count — DEFINISI KONSISTEN dengan kartu
 * statistik halaman /admin/dashboard:
 *   NEW            = [CREATED]                               ("Pesanan Baru")
 *   IN_PROGRESS    = [WAITING_CONFIRMATION, DEVICE_RECEIVED,  ("Sedang Diproses")
 *                     CHECKING, IN_PROGRESS]
 *   WAITING_APPROVAL = [WAITING_APPROVAL]                     ("Menunggu Persetujuan")
 *   COMPLETED      = [COMPLETED, DELIVERED]                   ("Service Selesai")
 *   ALL            = seluruh status                          ("Total Pesanan")
 * Prioritas: persetujuan → baru/terbaru → selesai → dalam proses → total.
 * ("berapa pesanan terbaru/terakhir" di konteks hitungan = jumlah pesanan BARU.)
 * Catatan: text yang diterima SUDAH dinormalisasi normalizeOperationalQuery
 * ("di proses" → "diproses", "lagi ditangani" → "sedang ditangani").
 */
function extractOrderStatusGroup(text: string): OrderCountStatusGroup {
  // Persetujuan — termasuk varian Inggris "pending approval" (bug P0:
  // "Ada berapa yang pending approval?" sempat jatuh ke intent unknown).
  if (new RegExp(String.raw`\b(?:${SG_APPROVAL})\b`, 'i').test(text)) return 'WAITING_APPROVAL';
  if (/\b(baru|masuk\s+(baru|tadi)|barusan|terbaru|terakhir)\b/i.test(text)) return 'NEW';
  if (/\b(?<!belum\s)(sudah|telah)?\s*(selesai|tuntas|diselesaikan)\b/i.test(text)) {
    return 'COMPLETED';
  }
  if (
    /\b(dalam\s+proses|dalam\s+pengerjaan|proses\s+pengerjaan|sedang\s+diproses|sedang\s+dikerjakan|sedang\s+diperbaiki|sedang\s+ditangani|diproses|dikerjakan|diperbaiki|ditangani|in\s+progress)\b/i.test(
      text
    )
  ) {
    return 'IN_PROGRESS';
  }
  return 'ALL';
}

/**
 * Pertanyaan DURASI (berapa lama / estimasi waktu) — bukan pertanyaan hitungan
 * data. Intent order_count tidak boleh menangkapnya (jawabannya waktu, bukan
 * angka jumlah pesanan) sehingga biarkan ke intent lain / provider.
 */
const DURATION_QUESTION_RE =
  /\b(berapa\s+lama|berapa\s+waktu|berapa\s+(hari|minggu|bulan|menit|detik)|rata-?rata|durasi|estimasi\s+(waktu|lama|hari))\b/i;

/**
 * Pertanyaan FINANSIAL (pendapatan/biaya) — bukan hitungan jumlah pesanan.
 * Pola generik order_count yang bebas urutan ("servis yang selesai … berapa")
 * bisa tidak sengaja menangkap "Berapa pendapatan dari servis yang selesai?",
 * sehingga pertanyaan finansial wajib diarahkan ke intent revenue_summary,
 * bukan order_count.
 */
const FINANCE_QUESTION_RE = /\b(pendapatan|revenue|laba|keuntungan|biaya)\b/i;

/* -------------------------------------------------------------------------- */
/* Router Utama                                                               */
/* -------------------------------------------------------------------------- */

export function routeAdminIntent(query: string): RouterResult {
  // Seragamkan varian ejaan dulu ("di proses" → "diproses", "lagi ditangani"
  // → "sedang ditangani") — semua pola di INTENT_PATTERNS dan seluruh
  // ekstraksi parameter di bawah memakai teks hasil normalisasi ini.
  const text = normalizeOperationalQuery(query.trim());

  // Skoring sederhana: hitung jumlah pola cocok per intent
  let best: RouterResult = {
    intent: 'unknown',
    toolName: null,
    input: {},
    confidence: 0,
    reason: 'Tidak ada pola intent yang cocok',
  };

  for (const { intent, patterns, toolName } of INTENT_PATTERNS) {
    // Pertanyaan durasi/finansial bukan hitungan data — jangan sampai ke
    // order_count (jawabannya waktu/uang, bukan angka jumlah pesanan).
    if (
      intent === 'order_count' &&
      (DURATION_QUESTION_RE.test(text) || FINANCE_QUESTION_RE.test(text))
    )
      continue;

    let matches = 0;
    for (const re of patterns) {
      if (re.test(text)) matches++;
    }
    if (matches > 0) {
      // Boost +0.1 untuk order_count: pertanyaan hitungan harus MENANG saat seri
      // dengan intent lain (mis. "berapa pesanan baru" vs recent_orders/order_stats).
      const confidence = Math.min(
        0.5 + matches * 0.2 + (intent === 'order_count' ? 0.1 : 0),
        1.0
      );
      if (confidence > best.confidence) {
        // Bangun input parameter berdasarkan intent
        let input: Record<string, unknown> = {};
        switch (intent) {
          case 'order_count':
            input = { statusGroup: extractOrderStatusGroup(text) };
            break;
          case 'customer_stats':
            input = { days: extractDays(text), take: extractTake(text), statusFilter: extractStatusFilter(text) };
            break;
          case 'order_stats':
            input = { days: extractDays(text), groupBy: extractGroupBy(text) };
            break;
          case 'recent_orders':
            input = { take: extractRecentCount(text) };
            break;
          case 'top_services':
            input = { days: extractDays(text), take: extractTake(text) };
            break;
          case 'inventory_summary':
            input = { stockStatus: extractStockStatus(text), take: extractTake(text, 15) };
            break;
          case 'revenue_summary':
            input = { days: extractDays(text) };
            break;
          case 'status_history':
            input = { days: extractDays(text), groupBy: 'status' };
            break;
          case 'service_duration':
            input = { days: extractDays(text), groupBy: 'daily' };
            break;
          case 'weekly_report':
            input = { days: 7, groupBy: 'daily' };
            break;
          case 'monthly_report':
            input = { days: 30, groupBy: 'daily' };
            break;
        }
        best = { intent, toolName, input, confidence, reason: `${matches} pola cocok untuk ${intent}` };
      }
    }
  }

  return best;
}

/* -------------------------------------------------------------------------- */
/* Eksekusi Tool dengan Validasi Role                                         */
/* -------------------------------------------------------------------------- */

export async function executeAdminTool(
  toolName: string,
  input: Record<string, unknown>,
  role: UserRole
): Promise<ToolResult> {
  const tool = getAdminTool(toolName);
  if (!tool) {
    throw new Error(`TOOL_NOT_FOUND: ${toolName}`);
  }
  assertRoleAllowed(tool, role);

  // Validasi input dengan schema tool
  const parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`TOOL_INPUT_INVALID: ${issues}`);
  }

  return tool.execute(parsed.data, role);
}

/* -------------------------------------------------------------------------- */
/* Pipeline Lengkap: Route → Execute                                          */
/* -------------------------------------------------------------------------- */

export interface AdminRouterOutput {
  /** Blok konteks siap disuntikkan ke system prompt (kosong jika unknown/forbidden). */
  contextBlock: string;
  /** Metadata untuk logging/observability. */
  meta: {
    intent: AdminIntent;
    toolName: string | null;
    confidence: number;
    reason: string;
    executed: boolean;
    error?: string;
    toolMeta?: unknown;
  };
}

/**
 * Pipeline utama untuk AI Admin:
 * 1. Klasifikasikan intent
 * 2. Validasi role (harus ADMIN)
 * 3. Eksekusi tool jika allowed
 * 4. Kembalikan blok konteks + metadata
 */
export async function runAdminRouter(query: string, role: UserRole): Promise<AdminRouterOutput> {
  if (role !== 'ADMIN') {
    return {
      contextBlock: '',
      meta: {
        intent: 'unknown',
        toolName: null,
        confidence: 0,
        reason: `Role ${role} tidak diizinkan mengakses tool admin`,
        executed: false,
        error: 'FORBIDDEN_ROLE',
      },
    };
  }

  const routed = routeAdminIntent(query);

  if (routed.intent === 'unknown' || !routed.toolName) {
    return {
      contextBlock: '',
      meta: { ...routed, executed: false },
    };
  }

  try {
    const result = await executeAdminTool(routed.toolName, routed.input, role);
    return {
      contextBlock: result.block,
      meta: { ...routed, executed: true, toolMeta: result.meta } as AdminRouterOutput['meta'] & { toolMeta?: unknown },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      contextBlock: '',
      meta: { ...routed, executed: false, error: msg },
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Daftar Intent Tersedia (untuk observability / testing)                     */
/* -------------------------------------------------------------------------- */

export function listAvailableIntents(): Array<{ intent: AdminIntent; toolName: string; description: string }> {
  return INTENT_PATTERNS.map(({ intent, toolName }) => {
    const tool = getAdminTool(toolName);
    return { intent, toolName, description: tool?.description ?? 'No description' };
  });
}