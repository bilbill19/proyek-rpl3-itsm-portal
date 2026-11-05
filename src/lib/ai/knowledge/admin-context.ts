/**
 * ============================================================================
 * knowledge/admin-context.ts — Perakit Konteks Admin (Read-Only, Sanitized)
 * ============================================================================
 *
 * Menggabungkan output router/tool menjadi blok SYSTEM message yang aman
 * disuntikkan ke NVIDIA/ExpertEngine. Hanya dipanggil untuk sesi ADMIN.
 *
 * PRINSIP:
 *   - Data PII (email, phone, address, name customer) DIHAPUSKAN kecuali
 *     yang eksplisit dibutuhkan (customer_stats tool mengembalikan email
 *     untuk ADMIN — ini by design, tapi tetap dibatasi).
 *   - Blok diberi label jelas sebagai DATA SISTEM, bukan ucapan user.
 *   - Ukuran dibatasi ~6 KB agar tidak melebihi context window.
 * ============================================================================
 */

import { runAdminRouter, AdminRouterOutput } from './router';
import { sanitizeOutboundText } from '@/lib/ai/egress';
import type { UserRole } from './tools';

/* -------------------------------------------------------------------------- */
/* Bangun Blok Konteks Admin Lengkap                                          */
/* -------------------------------------------------------------------------- */

export interface AdminContextOptions {
  /** Query user yang memicu pembuatan konteks. */
  userQuery: string;
  /** Role user (harus 'ADMIN'). */
  role: UserRole;
  /** Maksimal karakter total blok konteks (default ~6000). */
  maxChars?: number;
}

/**
 * Hasilkan blok konteks admin dari query user.
 * - Jalankan router → tool → dapatkan blok
 * - Sanitasi output (hilangkan API key, token, dll.)
 * - Potong jika melebihi maxChars
 */
export async function buildAdminContextBlock(options: AdminContextOptions): Promise<{
  block: string;
  meta: AdminRouterOutput['meta'];
}> {
  const { userQuery, role, maxChars = 6000 } = options;

  if (role !== 'ADMIN') {
    return {
      block: '',
      meta: {
        intent: 'unknown',
        toolName: null,
        confidence: 0,
        reason: `Role ${role} bukan ADMIN`,
        executed: false,
        error: 'FORBIDDEN_ROLE',
      },
    };
  }

  const routed = await runAdminRouter(userQuery, role);

  if (!routed.contextBlock) {
    return { block: '', meta: routed.meta };
  }

  // Sanitasi: hapus potensi API key/token yang mungkin bocor dari note/statusHistory
  const sanitized = sanitizeOutboundText(routed.contextBlock);

  // Potong ke maxChars (preserve header & footer)
  let finalBlock = sanitized;
  if (finalBlock.length > maxChars) {
    const lines = finalBlock.split('\n');
    // Simpan header (2 baris), footer (1 baris), sisakan untuk body
    const header = lines.slice(0, 2).join('\n');
    const footer = lines[lines.length - 1];
    const bodyBudget = maxChars - header.length - footer.length - 2;
    let body = '';
    for (let i = 2; i < lines.length - 1; i++) {
      if (body.length + lines[i].length + 1 > bodyBudget) break;
      body += (body ? '\n' : '') + lines[i];
    }
    finalBlock = [header, body, '[... DIPOTONG — BATAS KONTEKS ...]', footer].join('\n');
  }

  return { block: finalBlock, meta: routed.meta };
}

/* -------------------------------------------------------------------------- */
/* Helper: Bangun Blok Default Admin (tanpa query spesifik)                   */
/* -------------------------------------------------------------------------- */

/**
 * Blok ringkasan default untuk AI Admin saat user bertanya umum
 * ("bagaimana kondisi toko?", "ringkasan hari ini", dll.)
 * Menjalankan beberapa tool ringan secara paralel.
 */
export async function buildDefaultAdminContext(role: UserRole): Promise<string> {
  if (role !== 'ADMIN') return '';

  // Import dinamis agar circular dependency terhindar
  const { customerStatsTool, orderStatsTool, inventorySummaryTool, revenueSummaryTool } = await import('./tools');

  try {
    const [cust, ord, inv, rev] = await Promise.all([
      customerStatsTool.execute({ days: 30, take: 5, statusFilter: 'ALL' }, 'ADMIN'),
      orderStatsTool.execute({ days: 7, groupBy: 'status' }, 'ADMIN'),
      inventorySummaryTool.execute({ stockStatus: 'ALL', take: 10 }, 'ADMIN'),
      revenueSummaryTool.execute({ days: 30 }, 'ADMIN'),
    ]);

    const combined = [
      cust.block,
      '',
      ord.block,
      '',
      inv.block,
      '',
      rev.block,
    ].join('\n\n');

    return sanitizeOutboundText(combined);
  } catch (err) {
    console.error('[AdminContext] Gagal build default context:', err);
    return '';
  }
}

/* -------------------------------------------------------------------------- */
/* Deteksi Apakah Query Butuh Konteks Admin                                   */
/* -------------------------------------------------------------------------- */

const ADMIN_TRIGGER_PATTERNS = [
  /\b(bagaimana\s+kondisi|ringkasan|summary|overview)\s+(toko|store|usaha|bisnis|operasional)\b/i,
  /\b(laporan|report)\s+(mingguan|bulanan|harian|weekly|monthly|daily)\b/i,
  /\b(kondisi|status)\s+(umum|keseluruhan|overall)\b/i,
  /\bdashboard\s+admin\b/i,
];

/**
 * Cek cepat apakah query user memerlukan konteks admin default
 * (tanpa perlu router penuh). Dipakai untuk efisiensi.
 */
export function needsAdminDefaultContext(query: string): boolean {
  return ADMIN_TRIGGER_PATTERNS.some((re) => re.test(query));
}