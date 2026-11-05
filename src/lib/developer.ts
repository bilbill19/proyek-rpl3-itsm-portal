/**
 * ============================================================================
 * developer.ts — Developer Identity Configuration
 * ============================================================================
 *
 * Single source of truth for developer identity.
 * Used by all AI contexts (public, customer, admin) and watermark.
 * ============================================================================
 */

export interface DeveloperIdentity {
  name: string;
  role: string;
  website?: string;
}

export const DEVELOPER_IDENTITY: DeveloperIdentity = {
  name: 'Bilbina Maharani',
  role: 'Pengembang Website ITSM Portal',
  website: 'https://github.com/bilbina',
};

/**
 * Get formatted developer identity string
 */
export function getDeveloperIdentity(): string {
  return DEVELOPER_IDENTITY.name;
}

/**
 * Get formatted developer identity with role
 */
export function getDeveloperIdentityWithRole(): string {
  return `${DEVELOPER_IDENTITY.name} - ${DEVELOPER_IDENTITY.role}`;
}

/**
 * Check if a question is asking about the developer.
 *
 * PENGUATAN AUDIT — pertanyaan identitas developer WAJIB terdeteksi lebih dulu
 * (sebelum scope gate & diagnosis) pada semua variasi wajib:
 *   "Siapa yang membuat website ini?" / "Siapa pembuat website ini?" /
 *   "Siapa developer ITSM Portal?" / "Website ini dibuat oleh siapa?" /
 *   "Siapa pengembang aplikasi ini?" / "Who developed this website?"
 * Ditambah variasi informal Indonesia (yg, buat, bikin), sinonim (situs),
 * typo umum kata "website" (webiste/websitw), dan English
 * "who is the developer of this website". Tanpa ini, pertanyaan jatuh ke
 * scope gate (penolakan tugas) atau ExpertEngine (clarify "belum menangkap
 * masalah teknis") — dua kegagalan yang terbukti pada audit browser.
 *
 * ANTI-FALSE-POSITIVE: objek dibatasi istilah web/teknologi + "ini", sehingga
 * "siapa yang membuat pesanan saya / jadwal / akun" TIDAK tertangkap.
 */
export function isAskingAboutDeveloper(query: string): boolean {
  // Kata kerja "buat/membuat…": mendukung kontraksi informal + terjemahan EN.
  const VERBS =
    '(membuat|mengembangkan|mengembang|membangun|membikin|menciptakan|ciptakan|mendesain|merancang|buat|bikin|buatkan|bikinkan|created|developed|built|made|designed)';
  // Objek: istilah web/teknologi; `web[a-z]*` menoleransi typo (webiste,
  // websitw, websitenya) sekaligus mencakup "website" dan "web".
  const OBJECTS =
    '(website|web[a-z]*|situs|site[s]?|sistem|portal|aplikasi|program|software|project|ini|itsm|it\\s?sm\\s?portal)';

  const patterns = [
    // "Siapa yang membuat/buat/bikin website/sistem/ini?" (+ varian "yg").
    new RegExp(`\\b(siapa|who)\\s+(yang\\s+|yg\\s+)?${VERBS}\\s+${OBJECTS}\\b`, 'i'),
    // "Siapa pembuat/pengembang/developer website/itsm?" — objek wajib ada
    // agar "siapa pembuat lagu" dsb. tidak dianggap pertanyaan ini.
    new RegExp(
      `\\b(siapa|who)\\s+(pembuat|pengembang|developer|pembangun|creator|founder)\\s+(dari\\s+)?${OBJECTS}\\b`,
      'i'
    ),
    // English: "who is the developer of this website?"
    /\bwho\s+(is|was)\s+(the\s+)?(developer|creator|founder|author|designer)\s+(of\s+)?(this\s+|the\s+)?(website|site|portal|itsm|web\b)/i,
    // "Website ini dibuat/dikembangkan oleh siapa?" / "…sama siapa?" / "…siapa?"
    /\b(dibuat|dibangun|dikembangkan|dibikin|didesain|dirancang)\s+(oleh\s+|sama\s+)?(siapa|who)\b/i,
    // "Pengembang/developer sistem ini siapa?", "developer website ini"
    new RegExp(`\\b(pengembang|developer|pembuat|creator)\\s+(dari\\s+)?${OBJECTS}\\b`, 'i'),
    // "Website ini buatan/karya siapa?"
    new RegExp(`\\b${OBJECTS}\\s+ini\\s+(buatan|karya)\\s+(siapa|who)\\b`, 'i'),
    // "who created/developed this website"
    /\bwho\s+(created|developed|built|made|designed)\s+(this\s+)?(website|site|portal|itsm)/i,
  ];

  return patterns.some((re) => re.test(query));
}

/**
 * Get developer identity response for AI
 */
export function getDeveloperIdentityResponse(): string {
  return `Website ITSM Portal dikembangkan oleh **${DEVELOPER_IDENTITY.name}**.`;
}

/**
 * Tekankan nama developer menjadi Markdown bold dengan AMAN.
 *
 * Respons BARU sudah memakai `**Bilbina Maharani**`, tetapi respons LAMA yang
 * sudah tersimpan di riwayat chat kadang berupa teks polos tanpa penanda bold
 * (mis. "Website ITSM Portal dikembangkan oleh Bilbina Maharani.").
 * Fungsi ini membungkus nama developer dengan `**...**` HANYA bila belum
 * dibungkus, sehingga riwayat lama ikut tampil tebal tanpa mengubah data di
 * database. Renderer markdown berikutnya (parseMarkdown) mengubahnya menjadi
 * <strong> sungguhan sebagai React element — tanpa dangerouslySetInnerHTML.
 */
export function emphasizeDeveloperName(text: string): string {
  if (!text || !text.includes(DEVELOPER_IDENTITY.name)) return text;
  const escaped = DEVELOPER_IDENTITY.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Tolak bila sudah diapit ** di sisi kiri ATAU kanan (tak mendobel penanda).
  return text.replace(
    new RegExp(`(?<!\\*\\*)${escaped}(?!\\*\\*)`, 'g'),
    `**${DEVELOPER_IDENTITY.name}**`
  );
}