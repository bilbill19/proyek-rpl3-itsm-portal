/**
 * ============================================================================
 * PEMBATASAN DOMAIN KEDUA AI — Server-Side Scope Validation
 * ============================================================================
 *
 * Berlaku untuk SEMUA jalur AI (dicek di `runWithFallback` sebelum provider
 * utama maupun fallback dipanggil):
 *   1. AI Chatbot NVIDIA  (/api/ai/chat)           — publik
 *   2. AI Smart Diagnostic (/api/ai/conversations/*) — wajib login
 *   3. Dispatcher generik  generateAIResponse()
 *
 * DESAIN KLASIFIKATOR (bukan pencocokan kata sederhana):
 *   - Deteksi NIAT PEMBUATAN (creation intent): kata kerja perintah
 *     ("buatkan", "tulis", "make", "write", ...) yang berada dalam JENDELA
 *     PROXIMITY (≤5 token) dari objek deliverable ("kode", "coding",
 *     "website", "program", ...). Tanpa pasangan verb+objek → BUKAN
 *     permintaan pembuatan.
 *   - Deteksi NIAT TUGAS AKADEMIK (homework intent): verb tugas +
 *     objek akademik, atau pola bahasa Inggris (do my homework, ...).
 *   - Deteksi GEJALA/TROUBLESHOOTING (laporan kerusakan): penanda kegagalan
 *     ("error", "mati total", "blue screen", "tidak terhubung", exception
 *     teknis, ...) → DIIZINKAN, termasuk laporan error program seperti
 *     "Program Python saya error ModuleNotFoundError" (gejala teknis,
 *     BUKAN permintaan membuat program baru).
 *   - Deteksi INJECTION: pola "abaikan instruksi sebelumnya" dsb. — bila
 *     dikombinasikan isi di luar cakupan, penolakan tetap terjadi (classifier
 *     berjalan di server sebelum provider; instruksi dalam pesan TIDAK
 *     memengaruhi keputusan).
 *   - Lexicon DOMAIN ITSM (perangkat, software, jaringan, servis, tracking)
 *     dan daftar OFF-TOPIC umum (resep, puisi, cuaca, saham, ...) sebagai
 *     lapisan tambahan.
 *   - Pesan yang TIDAK jelas di luar cakupan (tidak kategori mana pun)
 *     diteruskan ke provider dengan system prompt berdomain ketat — hanya
 *     permintaan yang JELAS di luar cakupan yang ditolak lokal, sehingga
 *     kuota NVIDIA tidak terbuang untuk yang jelas-jelas di luar konteks.
 *
 * KEAMANAN PROMPT: system prompt di `ITSM_AI_SYSTEM_PROMPT` (index.ts)
 * memuat larangan eksplisit + anti-injection yang berlaku untuk seluruh
 * provider utama maupun fallback ExpertEngine.
 *
 * PENGUATAN AUDIT (pembatasan pengerjaan tugas — backend, sebelum provider):
 *   - Pasangan verb-aksi × objek akademik: "kerjain tugas", "selesaikan PR",
 *     "buatkan laporan praktikum".
 *   - Pasangan verb-lanjut/selesaikan/perbaik × objek kode: "lanjutkan kode",
 *     "perbaiki kode ini sampai tugas saya selesai".
 *   - Toleransi typo 1 karakter pada kata kunci akademik ("tugaz" → "tugas").
 *   - `classifyScopeWithHistory`: permintaan lanjutan ("lanjutkan dong")
 *     DITOLAK bila riwayat percakapan memuat permintaan tugas yang pernah
 *     ditolak (membatasi bypass bertahap / via riwayat percakapan).
 *   - Penolakan tugas memakai teks BERBRAND (Mimo publik, Miko internal).
 * ============================================================================
 */

import type { AIBrand } from './branding';

export type ScopeCategory =
  | 'it-troubleshooting'
  | 'it-service'
  | 'courtesy'
  | 'creation-code'
  | 'homework'
  | 'injection'
  | 'general-offtopic';

export interface ScopeVerdict {
  allowed: boolean;
  category: ScopeCategory;
  /** Alasan internal untuk observabilitas (tidak pernah berisi secret). */
  reason: string;
  /** True bila pesan memuat pola injeksi instruksi. */
  injection: boolean;
}

/** Penolakan untuk permintaan pembuatan kode / tugas (contoh resmi). */
export const SCOPE_REFUSAL_CODE =
  'Maaf, saya adalah asisten khusus layanan servis IT di ITSM Portal. Saya tidak dapat membantu membuat kode program atau mengerjakan tugas. Jika Anda mengalami kendala pada perangkat, aplikasi, atau jaringan, silakan jelaskan masalahnya. Anda juga dapat menggunakan layanan Pesan Service atau Tracking Service di portal ini.';

/** Penolakan untuk topik umum di luar layanan IT. */
export const SCOPE_REFUSAL_GENERAL =
  'Maaf, saya adalah asisten khusus layanan servis IT di ITSM Portal dan hanya dapat membantu seputar layanan servis perangkat, software, jaringan, pemesanan, serta tracking. Silakan sampaikan kendala pada perangkat, aplikasi, atau jaringan Anda, atau gunakan layanan Pesan Service / Tracking Service di portal ini.';

/**
 * Penolakan tugas BERBRAND (teks resmi kebijakan pembatasan pengerjaan tugas).
 * Mimo = chatbot publik; Miko = AI internal (customer & admin).
 */
export const MIMO_TASK_REFUSAL =
  'Maaf yaa, aku Mimo! Aku khusus membantu konsultasi dan masalah layanan IT, jadi engga bisa mengerjakan tugas atau membuat kode.';
export const MIKO_TASK_REFUSAL =
  'Maaf, saya Miko. Saya khusus membantu diagnosis dan layanan IT, bukan mengerjakan tugas atau membuat program.';

/** Susun teks penolakan sesuai kategori keputusan dan identitas AI konteks. */
export function buildScopeRefusal(verdict: ScopeVerdict, brand?: AIBrand): string {
  if (verdict.category === 'general-offtopic') {
    return SCOPE_REFUSAL_GENERAL;
  }
  // Kategori pembuatan kode / tugas / injeksi → penolakan tugas berbrand.
  if (brand === 'mimo') return MIMO_TASK_REFUSAL;
  if (brand === 'miko') return MIKO_TASK_REFUSAL;
  return SCOPE_REFUSAL_CODE;
}

/**
 * Deteksi apakah pesan memuat GEJALA kerusakan teknis.
 * Dipakai ExpertEngineProvider (AI Smart Diagnostic) untuk memutuskan apakah
 * layak menjawab dengan analisa gejala — pesan tanpa gejala TIDAK BOLEH
 * dibalas dengan diagnosis mengarang (lihat aturan percakapan AI Smart).
 */
export function hasTechnicalSymptom(text: string): boolean {
  return SYMPTOM.test(normalize(text || ''));
}

/* -------------------------------------------------------------------------- */
/* Normalisasi & tokenisasi                                                    */
/* -------------------------------------------------------------------------- */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token alfanumerik (mempertahankan +, #, . untuk istilah teknis). */
function tokenize(text: string): string[] {
  return text
    .split(/[^a-z0-9#+.]+/)
    .filter((t) => t.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Pola niat                                                                   */
/* -------------------------------------------------------------------------- */

/** Kata kerja perintah pembuatan (bukan kata kerja perbaikan). */
const CREATION_VERBS = new RegExp(
  [
    'buatkan', 'bikinkan', 'bikin', 'buatlah', 'buat',
    'tuliskan', 'tulis', 'kodekan', 'codingkan', 'programkan',
    'rancang', 'bangun', 'susun', 'susunkan',
    'make', 'create', 'write', 'generate', 'build', 'develop', 'design',
  ].join('|'),
  'i'
);

/** Objek deliverable pemrograman / pengembangan. */
const CODE_OBJECTS = new RegExp(
  [
    'kode', 'coding', 'program', 'skrip', 'script',
    'website', 'situs', 'web app', 'landing page', 'apk',
    'aplikasi', 'app', 'game', 'bot', 'algoritma',
    'html', 'css', 'javascript', 'typescript', 'python', 'java', 'sql',
    'regex', 'macro', 'vba', 'kalkulator', 'calculator',
    'source code', 'programnya',
    // Penguatan audit: frasa/frasa-terkait yang sebelumnya lolos.
    'code', 'proyek', 'project', 'next\\.js', 'react',
    'laravel', 'flutter', 'django', 'vue', 'kasir',
  ].join('|'),
  'i'
);

/** Frasa pembuatan non-deliverable (layanan akun/portal) → tidak ditolak. */
const CREATION_EXEMPT = new RegExp(
  [
    '(buat|bikin|daftarkan|buatkan|bikinkan)\\s+(akun|account|email|password|login)',
    'reset\\s+(password|kata\\s*sandi)',
    '(ganti|lupa)\\s+password',
    '(buat|bikin|buatkan|bikinkan)\\s+(jadwal|daftar|estimasi|tagihan|reservasi|janji)',
  ].join('|'),
  'i'
);

/** Kata kerja pengerjaan tugas. */
const HOMEWORK_VERBS = new RegExp(
  [
    // \\b WAJIB pada "kerjakan": tanpa batas kata, frasa operasional pasif
    // "sedang DIKERJAKAN" ("Ada berapa pesanan yang sedang dikerjakan?")
    // ikut terdeteksi sebagai niat tugas akademik dan salah ditolak.
    '\\bkerjakan\\b',
    'jawabkan\\s+soal',
    'jawab\\s+soal',
    'hitungkan\\s+soal',
  ].join('|'),
  'i'
);

/** Objek akademik (\bpr\b menangani "…selesaikan pr" di akhir kalimat). */
const HOMEWORK_OBJECTS = new RegExp(
  [
    'tugas', '\\bpr\\b', 'esai', 'essay', 'skripsi', 'makalah',
    'pekerjaan rumah', 'matematika', 'aljabar', 'integral',
    'fisika', 'kimia', 'biologi', 'assignment', 'homework',
    'quiz', 'ujian sekolah', 'tugas kuliah', 'tugas sekolah',
    'praktikum', '\\bujian\\b', '\\buts\\b', '\\buas\\b',
    '\\bsoal\\b', 'laporan praktikum', 'practicum',
  ].join('|'),
  'i'
);

/**
 * Kata kerja AKSI tugas (dipasangkan dengan objek akademik dalam jendela
 * proximity — "kerjain", "selesaikan", "tuntaskan", ...). Dites per-token.
 */
const HOMEWORK_ACTION_VERBS = new RegExp(
  [
    'kerjain', 'kerjakan', 'selesaikan', 'selesaiin', 'tuntaskan',
    'jawab', 'jawabkan', 'hitungkan',
  ].join('|'),
  'i'
);

/**
 * Kata kerja LANJUT/PERBAIK pada objek kode ("lanjutkan kode tugas",
 * "perbaiki kode ini sampai tugas saya selesai"). Dites per-token.
 * Permintaan perbaikan/lanjutan pekerjaan pemrograman = BUKAN diagnosis.
 */
const CODE_ACTION_VERBS = new RegExp(
  [
    'lanjut', 'lanjutkan', 'lanjutin', 'teruskan',
    'selesaikan', 'selesaiin', 'tuntaskan',
    'perbaiki', 'betulkan', 'fix', 'debug', 'repair',
    'continue', 'finish', 'complete',
  ].join('|'),
  'i'
);

/** Pola bahasa Inggris untuk tugas / pembuatan. */
const EN_HOMEWORK = new RegExp(
  [
    '(do|finish|solve|complete)\\s+(my|the)\\s+(homework|assignment|essay|math|problem)',
    '(write|compose)\\s+(an?\\s+)?(essay|report|article|poem)',
  ].join('|'),
  'i'
);
const EN_CREATION = new RegExp(
  [
    '(write|create|make|build|generate|code)\\s+(me\\s+)?(a|an|the)?\\s*[a-z0-9]{0,20}\\s*(code|program|script|website|app|application|calculator|game|bot)',
    'make\\s+me\\s+a\\s+',
  ].join('|'),
  'i'
);

/** Penanda gejala kegagalan / laporan kerusakan (troubleshooting). */
const SYMPTOM = new RegExp(
  [
    'error', 'gagal', 'failure', 'fail', 'crash', 'freeze', 'frozen',
    'hang', 'not responding', 'tidak berjalan', 'tidak bisa dijalankan',
    'tidak bisa dibuka', 'tidak respons', 'tidak merespons',
    'mati total', 'mati sendiri', 'tidak menyala', 'tidak nyala', 'matot',
    // Varian frasa "tidak bisa menyala" (kata "bisa" memutus substring
    // "tidak menyala" — tanpa varian ini, keluhan "tidak bisa menyala
    // sama sekali" lolos sebagai tanpa gejala dan terjawab followup keliru).
    'tidak bisa menyala', 'tidak bisa dinyalakan', 'tidak bisa hidup',
    'tidak dapat menyala', 'gak bisa nyala', 'gak nyala', 'ndak menyala',
    'blue screen', 'bsod', 'layar biru', 'layar hitam', 'blank',
    'corrupt', 'rusak', 'korslet', 'short circuit', 'overheat',
    'panas berlebih', 'lemot', 'lambat', 'stuck', 'bug', 'glitch',
    'exception', 'traceback', 'modulenotfounderror', 'syntaxerror',
    'segmentation fault', 'no display', 'tidak ada gambar',
    'tidak terhubung', 'tidak terdeteksi', 'putus', 'limited access',
    'no internet', 'koneksi lambat', 'tidak bisa connect',
    'force close', 'keluar sendiri', 'restart sendiri',
  ].join('|'),
  'i'
);

/** Kata kunci "bangun baru" — creation menang atas symptom. */
const NEW_BUILD = new RegExp(
  [
    'baru', 'from scratch', 'dari nol', 'dari awal',
    'kode baru', 'program baru', 'website baru', 'aplikasi baru',
    'script baru', 'dari pertama',
  ].join('|'),
  'i'
);

/** Lexicon domain layanan ITSM. */
const DOMAIN = new RegExp(
  [
    'laptop', 'komputer', 'pc desktop', 'cpu', 'gpu', 'vga', 'monitor',
    'layar', 'lcd', 'printer', 'scanner', 'router', 'modem', 'wifi', 'wi-fi',
    'jaringan', 'internet', 'kabel lan', 'windows', 'linux', 'macos',
    'android', 'browser', 'chrome', 'software', 'hardware', 'driver',
    'aplikasi', 'program', 'keyboard', 'mouse', 'baterai', 'charger',
    'adaptor', 'ssd', 'hdd', 'ram', 'motherboard', 'mainboard', 'bios',
    'virus', 'malware', 'storage', 'server', 'cctv', 'proyektor',
    'servis', 'perbaikan', 'garansi', 'teknisi', 'tiket', 'tracking',
    'melacak', 'lacak', 'pesanan', 'pemesanan', 'paket layanan',
    'estimasi biaya', 'biaya perbaikan', 'workshop', 'onsite', 'diagnosa',
    'diagnosis', 'upgrade', 'install ulang', 'instal', 'reinstall',
    'backup', 'pemulihan data', 'toshiba', 'asus', 'lenovo', 'acer',
    'samsung', 'axioo', 'apple', 'macbook', 'iphone', 'ipad',
  ].join('|'),
  'i'
);

/** Salam / interaksi sopan / meta tentang asisten. */
const COURTESY = new RegExp(
  [
    '^(halo|hai|hi|hello|hey|pagi|siang|sore|malam|assalamualaikum)',
    '^(terima kasih|makasih|thanks|thank you|ok|oke|siap|mantap|baik)',
    '^(siapa kamu|siapa anda|kamu siapa|kamu siapa\\?)',
    '^(tolong|bantuan|help)',
    'apa itu itsm',
  ].join('|'),
  'i'
);

/** Topik umum non-IT yang jelas di luar cakupan. */
const OFFTOPIC = new RegExp(
  [
    'resep (masak|nasi|makanan|kue)', 'cara memasak', 'memasak',
    'lirik (lagu|musik)', 'puisi', 'pantun', 'cerita (lucu|humor)',
    'lelucon', '\\bjokes?\\b', 'zodiak', 'ramalan', 'cuaca',
    'harga (saham|emas|bitcoin)', 'saham', 'cryptocurrency', 'bitcoin',
    'judi', 'togel', 'prediksi (bola|skor)', 'jadwal (film|bioskop|liga)',
    'sinopsis', 'drakor', 'terjemahkan', '\\btranslate\\b',
    'sejarah (dunia|peradaban|indonesia)',
    'siapa (presiden|penemu|ilmuwan|artis|aktor|penyanyi)',
    'kapan .* lahir', 'lagu ', 'musik', 'gitar', 'piano',
    'olahraga', 'sepak bola', 'timnas', 'diet', 'yoga',
    '\\bhoroscope\\b', 'movie', 'song lyrics', 'nonton',
  ].join('|'),
  'i'
);

/** Pola injeksi instruksi (pengguna mencoba mengubah batasan). */
const INJECTION = new RegExp(
  [
    'abaikan (instruksi|perintah|aturan|prompt) (sebelumnya|awal|lalu)',
    'lupakan (semua|aturan|instruksi)',
    'ignore (previous|prior|earlier) (instructions?|prompts?)',
    'disregard (previous|prior|all) (instructions?|rules?)',
    'ubah (peran|persona|aturan) (kamu|anda|andamu)',
    'jadi (kamu|anda) (bebas|tidak terbatas|tanpa batas)',
    'new instructions',
    'sekarang kamu (adalah|bukan|harus)',
  ].join('|'),
  'i'
);

/**
 * Penanda pesan LANJUTAN permintaan ("lanjutkan dong", "yang tadi").
 * Hanya menolak bila digabung dengan riwayat permintaan tugas yang pernah
 * ditolak (lihat classifyScopeWithHistory) — pesan lanjutan tanpa riwayat
 * tugas TETAP diizinkan (mis. "apa yang harus saya lakukan sekarang?").
 */
const CONTINUATION = new RegExp(
  [
    '\\b(lanjut|lanjutkan|lanjutin|teruskan|selesaikan|selesaiin|tuntaskan)\\b',
    'yang (tadi|sebelumnya)',
    'seperti (tadi|sebelumnya)',
    'kirim (kodenya|codenya)',
    '\\bcontinue\\b', '\\bgo\\s+on\\b',
    'finish (it|them|this)',
    'send (me )?(the )?code',
  ].join('|'),
  'i'
);

/* -------------------------------------------------------------------------- */
/* Helper proximity                                                            */
/* -------------------------------------------------------------------------- */

/** Cari token yang cocok `re` dalam jendela [from-before, from+after]. */
function nearby(tokens: string[], from: number, re: RegExp, before: number, after: number): boolean {
  const start = Math.max(0, from - before);
  const end = Math.min(tokens.length - 1, from + after);
  for (let i = start; i <= end; i++) {
    if (i === from) continue;
    if (re.test(tokens[i])) return true;
  }
  return false;
}

/** Ada pasangan verb-perintah + objek-deliverable dalam jendela proximity? */
function hasPair(tokens: string[], verbRe: RegExp, objRe: RegExp, before: number, after: number): boolean {
  for (let i = 0; i < tokens.length; i++) {
    if (verbRe.test(tokens[i])) {
      if (nearby(tokens, i, objRe, before, after)) return true;
    }
  }
  return false;
}

function hasCreationPair(tokens: string[]): boolean {
  return hasPair(tokens, CREATION_VERBS, CODE_OBJECTS, 3, 5);
}

/* -------------------------------------------------------------------------- */
/* Toleransi typo (1 karakter) pada kata kunci akademik                        */
/* -------------------------------------------------------------------------- */

const ACADEMIC_KEYWORDS = [
  'tugas', 'praktikum', 'skripsi', 'makalah', 'esai',
  'ujian', 'assignment', 'homework', 'quiz',
];

/** True bila edit distance a↔b ≤ 1 (satu substitusi / sisipan / hapus). */
function editWithin1(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diffs = 0;
    for (let i = 0; i < la; i++) {
      if (a[i] !== b[i] && ++diffs > 1) return false;
    }
    return diffs === 1;
  }
  const [short, long] = la < lb ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let skipped = false;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
    } else {
      if (skipped) return false; // sudah lebih dari satu penyisipan
      skipped = true;
      j++; // sisipan satu karakter pada `long`
    }
  }
  return true;
}

/** Normalisasi token: "tugaz" → "tugas" (hanya kata kunci akademik, token ≥4). */
function canonicalizeAcademicTokens(tokens: string[]): string[] {
  return tokens.map((t) => {
    if (t.length < 4) return t;
    for (const k of ACADEMIC_KEYWORDS) {
      if (editWithin1(t, k)) return k;
    }
    return t;
  });
}

/* -------------------------------------------------------------------------- */
/* Klasifikator utama                                                          */
/* -------------------------------------------------------------------------- */

export function classifyScope(rawMessage: string): ScopeVerdict {
  const text = normalize(rawMessage || '');
  const tokens = tokenize(text);

  const injection = INJECTION.test(text);

  // 1) Niat pembuatan kode / pengembangan (dengan pengecualian layanan portal)
  //    dan niat pengerjaan tugas akademik → TOLAK.
  //    (Lihat PENGUATAN AUDIT di header: pasangan aksi-tugas, verb-lanjut ×
  //    objek kode, dan toleransi typo kata kunci akademik.)
  const typoFixed = canonicalizeAcademicTokens(tokens);
  const creationPair = hasCreationPair(tokens) || EN_CREATION.test(text);
  const exempt = CREATION_EXEMPT.test(text);
  const homeworkVerb = HOMEWORK_VERBS.test(text);
  const homeworkObject =
    HOMEWORK_OBJECTS.test(text) || typoFixed.some((t) => HOMEWORK_OBJECTS.test(t));
  const enHomework = EN_HOMEWORK.test(text);
  // "kerjain tugas python gue" / "selesaikan pr saya" (aksi × objek akademik).
  const homeworkActionPair = hasPair(typoFixed, HOMEWORK_ACTION_VERBS, HOMEWORK_OBJECTS, 3, 6);
  // "buatkan laporan praktikum" (verb perintah × objek akademik).
  const creationToHomeworkPair = hasPair(typoFixed, CREATION_VERBS, HOMEWORK_OBJECTS, 3, 5);
  // "lanjutkan kode tugas" / "perbaiki kode ini sampai tugas saya selesai".
  const codeActionPair = hasPair(tokens, CODE_ACTION_VERBS, CODE_OBJECTS, 3, 6);
  const creationIntent = (creationPair || codeActionPair) && !exempt;
  const homeworkIntent =
    homeworkVerb ||
    enHomework ||
    (creationPair && homeworkObject) ||
    homeworkActionPair ||
    (creationToHomeworkPair && !exempt);

  const symptom = SYMPTOM.test(text);
  const newBuild = NEW_BUILD.test(text);

  if (homeworkIntent) {
    return {
      allowed: false,
      category: injection ? 'injection' : 'homework',
      reason: 'niat pengerjaan tugas akademik terdeteksi',
      injection,
    };
  }

  if (creationIntent && (!symptom || newBuild)) {
    return {
      allowed: false,
      category: injection ? 'injection' : 'creation-code',
      reason: 'pasangan kata kerja perintah + objek deliverable pemrograman terdeteksi',
      injection,
    };
  }

  // 2) Laporan gejala / troubleshooting (termasuk error program) → IZINKAN.
  if (symptom) {
    return {
      allowed: true,
      category: 'it-troubleshooting',
      reason: 'gejala kerusakan/troubleshooting terdeteksi',
      injection,
    };
  }

  // 3) Topik domain layanan ITSM → IZINKAN.
  if (DOMAIN.test(text)) {
    return {
      allowed: true,
      category: 'it-service',
      reason: 'topik domain layanan ITSM terdeteksi',
      injection,
    };
  }

  // 4) Salam / interaksi sopan → IZINKAN.
  if (COURTESY.test(text)) {
    return {
      allowed: true,
      category: 'courtesy',
      reason: 'salam/interaksi sopan',
      injection,
    };
  }

  // 5) Topik umum non-IT yang jelas di luar cakupan → TOLAK.
  if (OFFTOPIC.test(text)) {
    return {
      allowed: false,
      category: injection ? 'injection' : 'general-offtopic',
      reason: 'topik umum non-IT terdeteksi',
      injection,
    };
  }

  // 6) Tidak jelas di luar cakupan → izinkan; system prompt berdomain ketat
  //    yang akan menegaskan batasan di sisi model.
  return {
    allowed: true,
    category: 'it-service',
    reason: 'tidak terdeteksi sebagai di luar cakupan; diteruskan dengan system prompt berdomain',
    injection,
  };
}

/**
 * Klasifikasi dengan RIWAYAT percakapan — membatasi bypass bertahap.
 * Kondisi KONJUNGSI (keduanya harus terpenuhi agar menolak):
 *   1) pesan terbaru memuat penanda lanjutan ("lanjutkan dong", "yang tadi"), DAN
 *   2) riwayat memuat pesan USER yang pernah ditolak (kategori tugas/kode/injeksi).
 * Pesan lanjutan TANPA riwayat tugas tetap diizinkan (mis. "apa yang harus
 * saya lakukan sekarang?" pada riwayat diagnosis) — tidak merusak fungsi
 * diagnosis. Keputusan selalu diambil di server sebelum provider dipanggil.
 */
export function classifyScopeWithHistory(
  rawMessage: string,
  historyUserTexts: string[]
): ScopeVerdict {
  const latest = classifyScope(rawMessage);
  if (!latest.allowed) return latest;

  const text = normalize(rawMessage || '');
  if (!CONTINUATION.test(text)) return latest;

  const priorRejectedTask = (historyUserTexts || []).some((h) => {
    const v = classifyScope(h || '');
    return (
      !v.allowed &&
      (v.category === 'homework' || v.category === 'creation-code' || v.category === 'injection')
    );
  });

  if (priorRejectedTask) {
    return {
      allowed: false,
      category: latest.injection ? 'injection' : 'homework',
      reason: 'lanjutan permintaan dengan riwayat permintaan tugas yang pernah ditolak',
      injection: latest.injection,
    };
  }
  return latest;
}
