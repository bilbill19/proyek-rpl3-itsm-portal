/**
 * ============================================================================
 * customer-context.ts — Konteks database READ-ONLY untuk fitur AI (backend)
 * ============================================================================
 *
 * PRINSIP KEAMANAN (wajib dipertahankan):
 *   - Semua query hanya melalui Prisma ORM di sisi server; TIDAK ADA SQL bebas,
 *     dan model AI tidak pernah menerima akses database langsung.
 *   - Data pesanan SELALU difilter `customerId` (dari sesi login) sehingga satu
 *     customer tidak pernah bisa membaca pesanan customer lain.
 *   - Katalog layanan bersifat publik (data yang sama dengan /api/services
 *     untuk publik: hanya layanan `isActive`), tanpa PII, tanpa inventory.
 *   - Blok konteks database ditandai eksplisit sebagai data sistem
 *     (bukan ucapan user) dan TIDAK PERNAH disimpan sebagai pesan USER.
 *   - Tidak ada API key / token / password yang menyentuh file ini.
 *
 * Endpoint pemakai:
 *   - POST /api/ai/chat            (chatbot publik → katalog saja + guard privasi)
 *   - POST /api/ai/conversations   (AI Smart → katalog + pesanan milik sesi)
 *   - POST /api/ai/conversations/[id]/messages (sama, konteks di-refresh tiap pesan)
 * ============================================================================
 */

import prisma from '@/lib/prisma';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

/** Item katalog layanan aktif (data publik). */
export interface PublicCatalogItem {
  name: string;
  price: number;
  estimatedDuration: string;
}

/** Urutan 8 tahap baku (sesuai enum OrderStatus di schema.prisma). */
const ORDER_STATUS_FLOW = [
  'CREATED',
  'WAITING_CONFIRMATION',
  'DEVICE_RECEIVED',
  'CHECKING',
  'IN_PROGRESS',
  'WAITING_APPROVAL',
  'COMPLETED',
  'DELIVERED',
] as const;

/** Nomor tiket servis (format ITSM-YYYYMM-NNNN / SRV-YYYY-NNNN). */
const TICKET_RE = /\b[A-Z]{2,6}-\d{4,8}-\d{3,4}\b/i;

/**
 * Deteksi pertanyaan status/pesanan. Sengaja KETAT: harus memuat kata benda
 * pesanan (pesanan/order/tiket/servis/perbaikan) atau pola status yang jelas,
 * agar keluhan gejala ("Laptop saya mati total") TIDAK pernah hijack ke sini.
 */
const ORDER_INTENT_RE = new RegExp(
  [
    // status/progres + kata benda pesanan
    String.raw`\b(?:status|progres|progress|perkembangan|tahap(?:an)?|posisi)\s+(?:pesanan|order|tiket|servis|service|perbaikan|pengiriman|pengerjaan)\b`,
    // perintah cek + kata benda pesanan
    String.raw`\b(?:cek|lihat|periksa|tanyakan|update|bagaimana|gimana)\s+(?:status\s+)?(?:pesanan|order|tiket|servis|service|perbaikan)\b`,
    // kata benda pesanan + kepemilikan
    String.raw`\b(?:pesanan|order|tiket|servis|service|perbaikan)\s+(?:saya|aku|kami)\b`,
    // daftar pesanan terbaru/terakhir — jawaban TETAP dari pesanan SENDIRI
    // (query selalu difilter customerId sesi login; tidak pernah seluruh sistem)
    String.raw`\b(?:pesanan|order|tiket|servis|service|perbaikan)\s+(?:terbaru|terakhir|terkini|paling\s+baru)\b`,
    String.raw`\b(?:terbaru|terakhir|terkini)\s+(?:pesanan|order|tiket)\b`,
    // perintah daftar + jumlah + kata benda pesanan ("sebutkan 3 pesanan")
    String.raw`\b(?:sebutkan|tampilkan|tunjukkan|tunjukin|daftar|list)\s+\d{0,2}\s*(?:pesanan|order|tiket)\b`,
    // riwayat servis / pesanan
    String.raw`\briwayat\s+(?:servis|service|pesanan|order|perbaikan)\b`,
    // progres "sampai mana"
    String.raw`\bsampai\s+mana\b`,
    // estimasi biaya milik pesanan
    String.raw`\b(?:estimasi|perkiraan)\s+(?:biaya\s+)?(?:pesanan|order|servis|service|perbaikan)\b`,
    // biaya final / total bayar
    String.raw`\bbiaya\s+(?:final|akhir)\b`,
    String.raw`\btotal\s+(?:biaya|bayar|akhir)\b`,
  ].join('|'),
  'i'
);

/**
 * Permintaan DETAIL / riwayat progres EKSPLISIT — balasan detail penuh
 * (termasuk riwayat progres) hanya keluar bila user memintanya secara
 * eksplisit; permintaan daftar/status biasa cukup ringkasan.
 */
const ORDER_DETAIL_INTENT_RE = new RegExp(
  [
    String.raw`\bdetail(?:kan|nya)?\b`,
    String.raw`\briwayat\s+(?:progres|progress|pengerjaan|status)\b`,
    String.raw`\b(?:history|kronologi|rincian)\b`,
    String.raw`\bjelaskan\s+(?:secara\s+)?(?:lengkap|rinci)\b`,
  ].join('|'),
  'i'
);

/**
 * Permintaan data di luar akun sendiri (pelanggan lain / statistik global /
 * data sistem) — untuk peran Customer selalu DIMENTAHANKAN di backend
 * (tanpa query, tanpa angka global, tanpa data pihak ketiga).
 */
const OTHER_DATA_INTENT_RE = new RegExp(
  [
    String.raw`\b(?:pelanggan|customer|pengguna|user|orang|akun|member)\s+lain\b`,
    String.raw`\b(?:semua|seluruh|total|jumlah|keseluruhan)\s+(?:pelanggan|customer|pengguna|user|member)\b`,
    String.raw`\b(?:semua|seluruh)\s+(?:pesanan|order|tiket|servis|service|perbaikan)(?!\s*(?:saya|aku|ku|kami))\b`,
    String.raw`\b(?:seluruh|semua)\s+(?:data|sistem|database|tabel)\b`,
    String.raw`\b(?:siapa\s+saja|sebutkan|tampilkan)\s+(?:nama\s+)?(?:pelanggan|customer|pengguna|user|orang)\b`,
  ].join('|'),
  'i'
);

/**
 * Percobaan MUTASI lewat chat ("ubah status ... menjadi selesai") — pipeline
 * AI hanyalah pembaca (read-only); kalimat penolakan lembut ditambahkan agar
 * user tidak mengira permintaan perubahan dieksekusi.
 */
const MUTATION_ATTEMPT_RE =
  /\b(?:ubah|rubah|ganti|jadikan|set|update|perbarui|selesaikan|batal(?:kan)?|hapus|edit|tambah)\b[\s\S]{0,60}\b(?:status|pesanan|order|tiket|biaya|harga)\b|\b(?:status|pesanan|order|tiket|biaya)\b[\s\S]{0,40}\b(?:jadi|menjadi|selesai|lunas|dibatalkan|dihapus)\b/i;

/** Kalimat penolakan mutasi (dipakai bila user mencoba mengubah data via chat). */
const READ_ONLY_NOTE =
  'Catatan: saya hanya **membaca** data pesanan — perubahan status, biaya, atau data pesanan hanya dapat dilakukan teknisi/admin melalui dashboard resmi.';

/** Penolakan permintaan data pelanggan lain / statistik global (peran Customer). */
const OTHER_DATA_REFUSAL = [
  'Mohon maaf, saya hanya dapat menampilkan data pesanan yang milik **akun Anda sendiri**.',
  '',
  'Statistik global, data pelanggan lain, atau data sistem internal tidak tersedia untuk peran Customer — batasan ini berlaku untuk semua akun dengan peran Customer.',
  '',
  'Untuk pertanyaan seputar layanan, harga, keluhan perangkat, atau pesanan Anda sendiri, saya tetap siap membantu.',
].join('\n');

/**
 * Deteksi pertanyaan katalog layanan (deterministik, tanpa menebak).
 * Selain kata harga/biaya/tarif, deteksi juga pertanyaan PENELUSURAN katalog —
 * "apa saja layanan ...", "layanan apa saja yang tersedia", "daftar layanan" —
 * agar dijawab dari data database, bukan jatuh ke jalur diagnosis ExpertEngine.
 * (Tanpa pola ini, pertanyaan katalog tanpa kata "harga" lolos ke fallback
 * dan dijawab "Maaf, saya belum menangkap masalah teknis...".)
 */
const CATALOG_INTENT_RE = new RegExp(
  [
    String.raw`\b(?:harga|biaya|tarif|price|daftar\s+harga)\b`,
    String.raw`\bberapa\s+(?:biaya|harga|tarif)`,
    String.raw`\bapa\s+saja\s+(?:layanan|jasa|servis|service|perbaikan|repair)\b`,
    String.raw`\b(?:daftar|katalog|jenis|macam|pilihan|ragam)\s+(?:layanan|jasa|servis|service|perbaikan)\b`,
    String.raw`\b(?:layanan|jasa|servis|service|perbaikan)\s+(?:apa\s+saja|apa\s+aja|apa\s+yang)\b`,
    String.raw`\b(?:layanan|jasa|servis|service|perbaikan)[^?!.]{0,60}\b(?:tersedia|ditawarkan|disediakan)\b`,
  ].join('|'),
  'i'
);

/** Deteksi pertanyaan identitas USER (bukan asisten) — untuk AI Customer/Admin. */
const USER_IDENTITY_INTENT_RE = new RegExp(
  [
    // "siapa saya", "nama saya", "email saya", "role saya"
    '^(siapa|nama)\\s+(saya|aku|saya\\s+siapa|aku\\s+siapa)',
    '^(apa|siapa)\\s+(nama|email|alamat|telepon|nomor|nomer|role|peran|jabatan)\\s+(saya|aku|ku)',
    '^(tampilkan|lihat|tunjukin)\\s+(profil|profile|data|identitas|akun)\\s+(saya|aku|ku)',
    '^(saya|aku)\\s+(siapa|namaku|emailku|roleku|peranku)',
    // "apa role saya", "role saya apa", "apa jabatan saya?", "jabatan saya siapa?"
    '\\brole\\s+(saya|aku)\\b',
    '\\bperan\\s+(saya|aku)\\b',
    '\\bjabatan\\s+(saya|aku|ku)\\b',
    // "nama lengkap saya siapa?", "nama lengkap aku"
    '\\bnama\\s+lengkap\\b[^.?!]*\\b(saya|aku|ku)\\b',
    // "saya login sebagai siapa?", "login sebagai apa?"
    '^(saya|aku)\\s+login\\s+sebagai',
    '\\blogin\\s+sebagai\\s+(siapa|apa|aku)\\b',
    // "siapa yang sedang login?", "siapa yang login?", "saya sedang login sebagai apa?"
    '^siapa\\s+(yang\\s+)?(sedang\\s+)?login\\b',
    '\\bsedang\\s+login\\b',
    // "berapa pesanan saya", "jumlah pesanan saya"
    '\\b(jumlah|berapa)\\s+(pesanan|order|tiket)\\s+(saya|aku|ku)\\b',
    // "Email saya apa?", "Email aku siapa?", "Telepon saya berapa?"
    '\\b(email|e-?mail)\\s+(saya|aku|ku)\\b',
    '\\b(?:telepon|telefon|nomor\\s+telepon|alamat)\\s+(?:saya|aku|ku)\\b',
  ].join('|'),
  'i'
);

/** Format angka rupiah konsisten (Rp 150.000). */
function rp(amount: number): string {
  return formatCurrency(amount);
}

/* ========================================================================== */
/* KATALOG LAYANAN AKTIF (publik, TTL cache 5 menit)                          */
/* ========================================================================== */

const CATALOG_TTL_MS = 5 * 60 * 1000;
let catalogCache: { at: number; items: PublicCatalogItem[] } | null = null;

/**
 * Ambil katalog layanan AKTIF dari database (read-only).
 * Cache in-memory 5 menit agar setiap pesan tidak selalu memukul DB,
 * namun perubahan harga di database tetap terbaca tanpa restart.
 */
export async function getPublicCatalog(): Promise<PublicCatalogItem[]> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.items;
  }
  const rows = await prisma.service.findMany({
    where: { isActive: true },
    select: { name: true, price: true, estimatedDuration: true },
    orderBy: { name: 'asc' },
  });
  const items = rows.map((r) => ({
    name: r.name,
    price: Number(r.price),
    estimatedDuration: r.estimatedDuration || '-',
  }));
  catalogCache = { at: Date.now(), items };
  return items;
}

/** Blok konteks katalog untuk system message provider (bukan pesan user). */
export function formatCatalogBlock(items: PublicCatalogItem[]): string {
  if (!items || items.length === 0) return '';
  const lines = items.map(
    (i) => `- ${i.name}: ${rp(i.price)} (estimasi durasi: ${i.estimatedDuration})`
  );
  return [
    '[KATALOG LAYANAN RESMI — SUMBER: DATABASE ITSM (data sistem, bukan ucapan user)]',
    ...lines,
    'Aturan: gunakan nama dan harga layanan PERSIS dari daftar di atas. Jangan mengarang nama atau angka lain. Bila yang ditanya tidak ada dalam daftar, katakan data tidak tersedia di katalog dan arahkan ke menu Layanan.',
    '[AKHIR KATALOG LAYANAN]',
  ].join('\n');
}

/**
 * Jawaban deterministik untuk pertanyaan harga/katalog.
 * Mengembalikan null bila bukan pertanyaan katalog.
 */
export function getCatalogReply(
  userText: string,
  items: PublicCatalogItem[]
): string | null {
  if (!items || items.length === 0) return null;
  if (!CATALOG_INTENT_RE.test(userText)) return null;

  const text = userText.toLowerCase();
  const matched = items.filter((it) => {
    const words = it.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !['dan', 'untuk', 'dengan', 'layanan'].includes(w));
    return words.some((w) => text.includes(w));
  });
  const list = matched.length > 0 ? matched : items;

  const header =
    matched.length > 0
      ? 'Berikut harga layanan yang Anda maksud (data dari katalog resmi kami):'
      : 'Berikut daftar katalog layanan aktif kami:';

  const lines = list.map(
    (i) => `- **${i.name}** — ${rp(i.price)} (estimasi durasi: ${i.estimatedDuration})`
  );

  return [
    header,
    '',
    ...lines,
    '',
    'Harga tercantum adalah tarif jasa terbaru sesuai katalog layanan ITSM Portal. Estimasi final untuk kasus tertentu dikonfirmasi kembali setelah pemeriksaan teknisi.',
  ].join('\n');
}

/**
 * Handler DETERMINISTIK pertanyaan identitas USER (bukan asisten).
 * Untuk AI Smart Diagnostic Customer & AI Admin — jawab dari session Prisma.
 * Mengembalikan null bila bukan pertanyaan identitas user.
 * 
 * PRIVASI: Hanya mengembalikan nama, email, role dari session yang terautentikasi.
 * TIDAK mengembalikan password, hash, token, atau data sensitif.
 * TIDAK query database berdasarkan input user — hanya data dari session.
 */
export interface UserIdentityInfo {
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  id: string;
}

export async function getUserIdentityReply(
  userIdentity: UserIdentityInfo,
  userText: string
): Promise<string | null> {
  const text = (userText || '').toLowerCase().trim();
  if (!USER_IDENTITY_INTENT_RE.test(text)) return null;

  const { name, email, role, id } = userIdentity;
  const roleLabel = role === 'ADMIN' ? 'Administrator' : 'Pelanggan (Customer)';

  // Klasifikasi fokus pertanyaan — NAMA dan IDENTITAS LOGIN dipisah tegas:
  //   - Mengandung "nama"  → pertanyaan NAMA PRIBADI saja (tanpa campur role).
  //   - "Siapa saya?" / "Siapa yang sedang login?" / "Login sebagai siapa?"
  //     → identitas akun yang sedang login (nama + peran), tanpa mengarang.
  const isNameQuestion = /\bnama\b/.test(text);
  const isLoginIdentityQuestion =
    /\blogin\s+sebagai\b/.test(text) ||
    /^siapa\s+(yang\s+)?(sedang\s+)?login\b/.test(text) ||
    /\bsedang\s+login\b/.test(text) ||
    /^(siapa|siapakah)\s+(saya|aku)\b/.test(text) ||
    /^(saya|aku)\s+siapa\b/.test(text);

  if (isNameQuestion || isLoginIdentityQuestion) {
    // NAMA = field `name` akun di database (session segar dari getSession →
    // hasil edit di menu Manajemen User langsung tercermin) — BUKAN
    // jabatan/role, TIDAK hardcode. Bila kosong → jawab jujur dan arahkan
    // pengisian ke menu Manajemen User.
    const accountName = (name || '').trim();
    if (!accountName) {
      if (isNameQuestion && !isLoginIdentityQuestion) {
        return [
          'Nama akun Anda **belum tercatat** di sistem, jadi saya tidak bisa menyebutkannya (saya tidak mengarang nama).',
          '',
          'Silakan lengkapi nama melalui menu **Manajemen User** di dashboard Admin — setelah itu pertanyaan ini akan dijawab dengan nama Anda yang sebenarnya. Peran/otorisasi akun Anda tetap aktif meski nama belum diisi.',
        ].join('\n');
      }
      return [
        `Anda login di ITSM Portal dengan peran **${roleLabel}** (${role}), tetapi nama akun Anda belum tercatat di sistem (saya tidak mengarang nama).`,
        '',
        'Silakan lengkapi nama melalui menu **Manajemen User** di dashboard Admin agar identitas akun tampil lengkap.',
      ].join('\n');
    }
    if (isNameQuestion) {
      // "Siapa nama saya?" / "Nama lengkap saya siapa?" → HANYA nama pribadi.
      return `Nama Anda adalah **${accountName}**.`;
    }
    // "Siapa saya?" / "Siapa yang sedang login?" / "Saya login sebagai siapa?"
    // → identitas akun: nama pribadi + peran (dipisah jelas, tanpa mencampur
    // jabatan ke dalam "nama").
    return `Anda login sebagai **${accountName}** dengan peran **${roleLabel}** (${role}) di ITSM Portal.`;
  }
  if (/\bemail\b/.test(text)) {
    return `Email akun Anda adalah **${email}**.`;
  }
  if (/\b(role|peran|jabatan)\b/.test(text)) {
    // "Apa jabatan saya?" → jabatan/role (Otorisasi) — bukan nama.
    return `Jabatan/role akun Anda adalah **${roleLabel}** (${role}) — dipakai untuk otorisasi akses.`;
  }
  if (/\b(nomor|telepon|telefon)\b/.test(text)) {
    // Nomor telepon tidak disimpan di session — ambil dari DB jika perlu
    return `Nomor telepon tidak tersedia di sesi saat ini. Silakan cek profil akun Anda di dashboard.`;
  }
  if (/\b(jumlah|berapa)\s+(pesanan|order|tiket)\b/.test(text)) {
    // Hitung pesanan user dari DB
    const count = await prisma.serviceOrder.count({ where: { customerId: id } });
    return `Anda memiliki **${count}** pesanan servis di sistem kami.`;
  }

  // Default: lengkap
  const orderCount = await prisma.serviceOrder.count({ where: { customerId: id } });
  const accountName = (name || '').trim() || '(belum tercatat)';
  return [
    `Identitas akun yang sedang login:`,
    `- **Nama:** ${accountName}`,
    `- **Email:** ${email}`,
    `- **Role:** ${roleLabel} (${role})`,
    `- **Jumlah pesanan:** ${orderCount}`,
  ].join('\n');
}

/* ========================================================================== */
/* PROSEDUR PEMESANAN (deterministik, fakta alur portal — tanpa provider)      */
/* ========================================================================== */

/** Deteksi pertanyaan prosedur PEMESANAN servis ("cara memesan servis", dll). */
const ORDER_PROCEDURE_INTENT_RE = new RegExp(
  [
    String.raw`\b(?:cara|gimana|bagaimana|prosedur|tata\s+cara|langkah|panduan)\s+(?:untuk\s+)?(?:memesan|mesan|memesankan|pemesanan|pesan|order|booking)\b`,
    String.raw`\b(?:saya\s+)?(?:mau|ingin|akan|bisa|boleh)\s+(?:pesan|memesan|mesan|order)\b`,
  ].join('|'),
  'i'
);

/**
 * Jawaban DETERMINISTIK prosedur pemesanan servis (FAQ portal).
 * Mengembalikan null bila bukan pertanyaan prosedur pemesanan.
 * Sengaja deterministik: pertanyaan prosedur tidak boleh bergantung pada
 * provider AI (NIM dapat timeout) — langkah yang disebutkan adalah alur
 * nyata portal ini (menu, tiket, tracking, tahap 1–8, garansi).
 */
export function getOrderingProcedureReply(userText: string): string | null {
  if (!ORDER_PROCEDURE_INTENT_RE.test(userText)) return null;
  return [
    'Cara memesan servis di ITSM Portal (alur resmi portal ini):',
    '',
    '1. **Login** ke dashboard pelanggan dengan akun Anda.',
    '2. Buka menu **Pesanan Service** (atau tombol **Pesan Service**).',
    '3. Pilih jenis layanan dari katalog, isi jenis perangkat dan keluhan Anda — estimasi harga tampil sesuai katalog resmi.',
    '4. Kirim pesanan → sistem membuat **nomor tiket** servis khusus untuk Anda.',
    '5. Pantau progres pengerjaan (tahap 1–8) lewat menu **Tracking Service** atau dashboard; teknisi mengonfirmasi estimasi sebelum pengerjaan lanjut.',
    '',
    'Setelah servis selesai berlaku **garansi pengerjaan 90 hari**. Silakan tanyakan juga layanan yang tersedia atau keluhan perangkat Anda — saya siap membantu.',
  ].join('\n');
}

/* ========================================================================== */
/* KONTEKS PESANAN PELANGGAN (difilter customerId sesi login)                 */
/* ========================================================================== */

/**
 * Blok konteks pesanan untuk system message AI Smart Diagnostic.
 * Diambil FRESH (read-only) setiap pesan → tahu perubahan status terbaru
 * tanpa restart. Maks 3 pesanan terbaru milik sesi login.
 */
export async function getOrderContextBlock(customerId: string): Promise<string> {
  const orders = await prisma.serviceOrder.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { service: true },
  });
  if (orders.length === 0) return '';

  const lines = orders.map((o, idx) => {
    const label = getOrderStatusLabel(o.status).label;
    const stage = ORDER_STATUS_FLOW.indexOf(o.status as (typeof ORDER_STATUS_FLOW)[number]);
    const serviceName = o.service?.name || 'layanan belum ditentukan';
    const device = `${o.deviceType}${o.deviceBrand ? ' ' + o.deviceBrand : ''}`;
    const est = o.estimatedPrice != null ? rp(Number(o.estimatedPrice)) : 'belum diestimasi';
    const fin =
      o.finalPrice != null ? rp(Number(o.finalPrice)) : 'belum ada biaya final';
    const problem = (o.problemDescription || '').replace(/\s+/g, ' ').slice(0, 90);
    return `${idx + 1}. Tiket ${o.ticketNumber} | ${serviceName} | ${device} | Status: ${o.status} (${label}${stage >= 0 ? `, tahap ${stage + 1}/8` : ''}) | Estimasi: ${est} | Biaya final: ${fin} | Masalah: ${problem}`;
  });

  return [
    '[DATA PESANAN PELANGGAN — SUMBER: DATABASE (data sistem, bukan ucapan user; hanya pesanan milik akun ini)]',
    ...lines,
    'Aturan: angka dan status di atas adalah fakta dari database. Jangan mengarang status/biaya lain; bila data tidak ada, katakan tidak ada datanya.',
    '[AKHIR DATA PESANAN]',
  ].join('\n');
}

/** Guard chatbot PUBLIK: tidak pernah menyentuh data pesanan pribadi. */
export function getPublicChatPrivacyReply(userMessage: string): string | null {
  const mentionsTicket = TICKET_RE.test(userMessage);
  if (!mentionsTicket && !ORDER_INTENT_RE.test(userMessage)) return null;

  return [
    'Mohon maaf, chatbot publik ini **tidak dapat menampilkan status atau detail pesanan pribadi** — data pesanan hanya dapat diakses lewat akun Anda sendiri.',
    '',
    'Untuk mengecek status servis, silakan gunakan menu **Tracking Service** di halaman ini dengan nomor tiket Anda, atau login ke dashboard pelanggan untuk melihat riwayat pesanan.',
    '',
    'Untuk pertanyaan umum seputar layanan, harga, atau keluhan perangkat, saya tetap siap membantu.',
  ].join('\n');
}

/** Guard chatbot PUBLIK: tolak pertanyaan identitas pribadi & data internal. */
export function getPublicIdentityGuardReply(userMessage: string): string | null {
  const text = (userMessage || '').toLowerCase().trim();

  // Pola pertanyaan identitas pribadi / data internal
  const patterns = [
    // Identitas diri user
    /^(siapa|nama)\s+(saya|aku|saya\s+siapa|aku\s+siapa)/i,
    /^(apa|siapa)\s+(email|alamat|telepon|nomor|nomer)\s+(saya|aku)/i,
    /^(tampilkan|lihat|tunjukin)\s+(profil|profile|data|identitas|akun)\s+(saya|aku|ku)/i,
    /^(saya|aku)\s+(siapa|namaku|emailku)/i,
    // Data customer lain / internal / statistik admin
    /^(siapa|daftar|tampilkan|lihat)\s+(customer|pelanggan|user)\s+(yang\s+login|sedang\s+login|ini)/i,
    // "berapa total customer", "total berapa customer", "jumlah customer", "berapa customer"
    /^(total|jumlah|berapa)\s+(?:total\s+)?(customer|pelanggan|user|akun)\s*(perusahaan|pt|toko|kantor)?/i,
    /^(tampilkan|lihat|tunjukin)\s+(data\s+)?(internal|rahasia|statistik)\s*(perusahaan|pt|toko|kantor)?/i,
    /^(data|informasi)\s+(internal|rahasia|perusahaan|kantor)/i,
  ];

  for (const re of patterns) {
    if (re.test(text)) {
      return [
        'Maaf, chatbot publik ini **tidak memiliki akses ke identitas pribadi atau data internal** — saya hanya melayani konsultasi layanan servis IT, katalog, harga, dan prosedur pemesanan.',
        '',
        'Untuk informasi akun Anda sendiri, silakan login ke dashboard pelanggan. Untuk data operasional internal, hubungi administrator.',
        '',
        'Saya tetap siap membantu pertanyaan seputar layanan ITSM Portal, keluhan perangkat, atau prosedur servis.',
      ].join('\n');
    }
  }
  return null;
}

interface OrderRow {
  ticketNumber: string;
  status: string;
  deviceType: string;
  deviceBrand: string | null;
  problemDescription: string | null;
  estimatedPrice: unknown;
  finalPrice: unknown;
  createdAt: Date;
  service: { name: string; estimatedDuration: string | null } | null;
  statusHistory: { status: string; note: string | null; createdAt: Date }[];
}

function stageText(status: string): string {
  const stage = ORDER_STATUS_FLOW.indexOf(status as (typeof ORDER_STATUS_FLOW)[number]);
  return stage >= 0 ? ` (tahap ${stage + 1} dari 8)` : '';
}

function formatSingleOrderReply(o: OrderRow): string {
  const label = getOrderStatusLabel(o.status).label;
  const serviceName = o.service?.name || 'layanan belum ditentukan';
  const duration = o.service?.estimatedDuration || '-';
  const device = `${o.deviceType}${o.deviceBrand ? ' ' + o.deviceBrand : ''}`;
  const est =
    o.estimatedPrice != null
      ? rp(Number(o.estimatedPrice))
      : 'belum ada estimasi tercatat';
  const fin =
    o.finalPrice != null
      ? rp(Number(o.finalPrice))
      : 'belum ada — biaya final dihitung setelah servis selesai';

  const historyLines = (o.statusHistory || [])
    .slice(0, 5)
    .reverse()
    .map((h) => {
      const hLabel = getOrderStatusLabel(h.status).label;
      const note = h.note ? ` — ${h.note}` : '';
      return `  - ${formatDate(h.createdAt)} — **${hLabel}**${note}`;
    });

  const out = [
    'Berikut status pesanan Anda:',
    '',
    `**Tiket ${o.ticketNumber}**`,
    `- Layanan: **${serviceName}** (estimasi durasi: ${duration})`,
    `- Perangkat: ${device}`,
    `- Status saat ini: **${label}**${stageText(o.status)}`,
    `- Masalah yang dilaporkan: ${o.problemDescription || '-'}`,
    `- Estimasi biaya: ${est}`,
    `- Biaya final: ${fin}`,
  ];

  if (historyLines.length > 0) {
    out.push('- Riwayat progres terakhir:');
    out.push(...historyLines);
  }

  out.push('', 'Data di atas hanya menampilkan pesanan milik akun Anda.');
  return out.join('\n');
}

/**
 * Ringkasan daftar pesanan (permintaan daftar/status tanpa nomor tiket).
 * Format: jumlah total milik sendiri → daftar ringkas bernomor (tiket,
 * perangkat, layanan, status, biaya relevan) TANPA riwayat progres —
 * detail penuh hanya bila user meminta (intent detail) / menyebut tiket.
 * Angka selalu dari database (count + baris scoped customerId), tanpa mengarang.
 */
function formatOrderSummaryList(
  orders: OrderRow[],
  totalCount: number,
  shownCount: number
): string {
  const lines = orders.map((o, idx) => {
    const label = getOrderStatusLabel(o.status).label;
    const serviceName = o.service?.name || 'layanan belum ditentukan';
    const device = `${o.deviceType}${o.deviceBrand ? ' ' + o.deviceBrand : ''}`;
    const cost =
      o.finalPrice != null
        ? `Biaya final: **${rp(Number(o.finalPrice))}**`
        : o.estimatedPrice != null
          ? `Estimasi biaya: ${rp(Number(o.estimatedPrice))}`
          : 'Biaya: belum ada';
    return `${idx + 1}. Tiket **${o.ticketNumber}** / Perangkat: ${device} — ${serviceName} / Status: ${label}${stageText(o.status)} / ${cost}`;
  });

  const head =
    totalCount === 1
      ? 'Anda memiliki **1** pesanan. Berikut pesanan terbaru Anda:'
      : `Anda memiliki **${totalCount}** pesanan servis. Berikut ${
          shownCount < totalCount ? `${shownCount} pesanan terbaru` : 'ringkasan pesanan'
        } Anda:`;

  return [
    head,
    '',
    ...lines,
    '',
    'Untuk informasi lebih lanjut, Anda bisa menanyakan detail pesanan Anda.',
  ].join('\n');
}

/**
 * Handler DETERMINISTIK pertanyaan status pesanan.
 * Mengembalikan null bila pesan bukan pertanyaan status/pesanan.
 * Semua query difilter `customerId` → mustahil membaca pesanan customer lain.
 */
export async function getOrderStatusReply(
  customerId: string,
  userText: string
): Promise<string | null> {
  // Guard: permintaan data pelanggan lain / statistik global → mentahkan
  // langsung (tanpa query data pihak ketiga, tanpa angka sistem).
  if (OTHER_DATA_INTENT_RE.test(userText)) {
    return OTHER_DATA_REFUSAL;
  }

  const ticketMatch = userText.match(TICKET_RE);
  const ticket = ticketMatch ? ticketMatch[0] : null;
  if (!ticket && !ORDER_INTENT_RE.test(userText)) return null;

  const isMutationAttempt = MUTATION_ATTEMPT_RE.test(userText);
  const withReadOnlyNote = (text: string) =>
    isMutationAttempt ? `${text}\n\n${READ_ONLY_NOTE}` : text;

  // Ada nomor tiket → cari spesifik milik sendiri saja (scoped).
  if (ticket) {
    const order = await prisma.serviceOrder.findFirst({
      where: {
        ticketNumber: { equals: ticket, mode: 'insensitive' },
        customerId, // <- kepemilikan wajib: milik sendiri atau 404-tidak-ada
      },
      include: {
        service: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) {
      return `Mohon maaf, nomor tiket **${ticket.toUpperCase()}** tidak ditemukan atas akun Anda. Silakan periksa kembali nomor pada faktur/email Anda, atau hubungi customer service kami.`;
    }
    return withReadOnlyNote(formatSingleOrderReply(order));
  }

  const orders = await prisma.serviceOrder.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      service: true,
      statusHistory: { orderBy: { createdAt: 'desc' } },
    },
  });
  // Jumlah TOTAL milik sendiri (scoped) — selalu dari database, bukan tebakan.
  const totalCount = await prisma.serviceOrder.count({ where: { customerId } });

  // Jumlah eksplisit ("3 pesanan terbaru") → batasi daftar sebanyak itu.
  // Bila pesanan user lebih sedikit, tampilkan apa adanya — TIDAK mengarang.
  const countMatch = userText.match(
    /\b(\d{1,2})\s+(?:pesanan|order|tiket|servis|service|perbaikan)\b/i
  );
  const requestedCount = countMatch
    ? Math.min(Math.max(parseInt(countMatch[1], 10), 1), 10)
    : null;
  const visibleOrders = requestedCount ? orders.slice(0, requestedCount) : orders;

  if (visibleOrders.length === 0) {
    return 'Saya tidak menemukan pesanan servis atas akun Anda saat ini. Anda dapat membuat pesanan baru melalui menu **Pesanan Service**, atau lacak tiket yang sudah ada lewat menu **Tracking Service**.';
  }

  // Permintaan detail/riwayat progres EKSPLISIT → detail penuh (punya
  // riwayat progres) untuk setiap tiket yang tampak.
  if (ORDER_DETAIL_INTENT_RE.test(userText)) {
    return withReadOnlyNote(visibleOrders.map(formatSingleOrderReply).join('\n\n---\n\n'));
  }

  // Default (daftar/status) → ringkasan dulu, tanpa riwayat progres.
  return withReadOnlyNote(
    formatOrderSummaryList(visibleOrders, totalCount, visibleOrders.length)
  );
}
