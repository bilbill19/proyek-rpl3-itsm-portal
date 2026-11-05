/**
 * pipeline.ts — Pipeline generasi balasan AI Miko (internal) yang BERSAMA
 * dipakai oleh tiga endpoint percakapan berbasis riwayat:
 *   - POST /api/ai/conversations               (pesan pertama saat buat chat baru)
 *   - POST /api/ai/conversations/[id]/messages (pesan lanjutan)
 *   - POST /api/ai/admin                       (endpoint admin stateless)
 *
 * Urutan keputusan (identik dengan perilaku sebelumnya, direfaktor):
 *   1. Identitas pengembang  → deterministik (SEBELUM scope gate).
 *   2. Scope gate            → penolakan di luar domain tanpa memanggil provider.
 *   3. Identitas user        → deterministik dari sesi login (siapa saya?).
 *   4. Role ADMIN            → pipeline operasional (konteks agregasi database
 *                              admin: customer, pesanan, inventory, finansial).
 *   5. Role CUSTOMER         → status pesanan → katalog → diagnosis percakapan.
 *
 * PRIVASI: kepemilikan percakapan/divalidasi di route (customerId = sesi login);
 * konteks DB customer selalu difilter customerId sesi; pipeline ini read-only.
 */

import { generateDiagnosticResponse, type AIGenerationContext, type RecommendedServiceMeta } from '@/lib/ai';
import { classifyScope } from '@/lib/ai/scope';
import {
  formatCatalogBlock,
  getCatalogReply,
  getOrderContextBlock,
  getOrderStatusReply,
  getOrderingProcedureReply,
  getPublicCatalog,
  getUserIdentityReply,
  type PublicCatalogItem,
  type UserIdentityInfo,
} from '@/lib/customer-context';
import { isAskingAboutDeveloper, getDeveloperIdentityResponse } from '@/lib/developer';
import { getSmalltalkReply } from '@/lib/ai/smalltalk';
import {
  buildAdminContextBlock,
  buildDefaultAdminContext,
  needsAdminDefaultContext,
} from '@/lib/ai/knowledge/admin-context';
import {
  buildAdminDataReply,
  toUserFacingDataText,
} from '@/lib/ai/knowledge/admin-data-reply';
import type { AdminRouterOutput } from '@/lib/ai/knowledge/router';
import { sanitizeOutboundText } from '@/lib/ai/egress';
import { NVIDIA_ADMIN_PROMPT } from '@/lib/ai/prompts';
import type { Role } from '@/types';

export interface PipelineSession {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface RoleReplyResult {
  reply: string;
  provider: string;
  recommendedService?: RecommendedServiceMeta | null;
  scopeAllowed: boolean;
  scopeReason: string;
}

export async function generateRoleReply(
  session: PipelineSession,
  userText: string,
  history: { role: string; content: string }[]
): Promise<RoleReplyResult> {
  // 1) Identitas pengembang resmi — jawaban deterministik dari satu sumber
  //    konfigurasi; dicek SEBELUM scope gate (classifier bisa menganggap
  //    "siapa yang membuat website ini" sebagai creation intent).
  const developerReply = isAskingAboutDeveloper(userText)
    ? getDeveloperIdentityResponse()
    : null;
  const verdict = classifyScope(userText);

  if (developerReply) {
    return {
      reply: developerReply,
      provider: 'deterministic-developer-identity',
      scopeAllowed: true,
      scopeReason: 'developer-identity',
    };
  }

  if (!verdict.allowed) {
    // Gate domain → balasan penolakan tanpa memanggil provider/model.
    const refused = await generateDiagnosticResponse(history, userText);
    return {
      reply: refused.reply,
      provider: refused.provider ?? 'scope-restriction',
      scopeAllowed: false,
      scopeReason: verdict.reason,
    };
  }

  // 3) Pertanyaan identitas user (siapa saya, email saya, role saya) →
  //    deterministik dari sesi login — berlaku untuk customer maupun admin.
  const userIdentity: UserIdentityInfo = {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
  };
  const identityReply = await getUserIdentityReply(userIdentity, userText);
  if (identityReply) {
    return {
      reply: identityReply,
      provider: 'deterministic-user-identity',
      scopeAllowed: true,
      scopeReason: verdict.reason,
    };
  }

  // 3b) Sapaan/penutup percakapan ("Halo.", "Terima kasih, konsultasinya sudah
  //     selesai.") → balasan identitas resmi yang INSTAN (<1 dtk): tanpa panggilan
  //     provider, tanpa query — jawaban selalu relevan dan tidak menunggu
  //     latency NVIDIA (penting saat provider sedang gangguan).
  const smalltalkReply = getSmalltalkReply(userText, {
    brand: 'miko',
    isAdmin: session.role === 'ADMIN',
  });
  if (smalltalkReply) {
    return {
      reply: smalltalkReply,
      provider: 'deterministic-smalltalk',
      scopeAllowed: true,
      scopeReason: verdict.reason,
    };
  }

  // Katalog layanan segar (read-only) — dipakai pipeline admin maupun customer.
  let catalog: PublicCatalogItem[] = [];
  try {
    catalog = await getPublicCatalog();
  } catch (err) {
    console.error('Gagal memuat katalog layanan:', (err as Error)?.message || err);
  }

  // 4) Role ADMIN → pipeline operasional Miko Admin (sama dengan
  //    NVIDIA_ADMIN_PROMPT + konteks agregasi database, 100% read-only).
  if (session.role === 'ADMIN') {
    let adminContextBlock = '';
    let adminMeta: AdminRouterOutput['meta'] | null = null;
    if (needsAdminDefaultContext(userText)) {
      adminContextBlock = await buildDefaultAdminContext('ADMIN');
    } else {
      const routed = await buildAdminContextBlock({
        userQuery: userText,
        role: 'ADMIN',
      });
      adminContextBlock = routed.block;
      adminMeta = routed.meta;

      // Data operasional sederhana (intent tool cocok & tool ter-eksekusi) →
      // jawaban DETERMINISTIS langsung dari database: ~1 detik, angka asli dari
      // DB, tanpa menunggu provider generatif, dan tanpa penanda internal blok.
      // Pertanyaan analisis/naratif (intent unknown) tetap diteruskan ke provider.
      if (adminMeta.executed && adminMeta.toolName) {
        const directReply = buildAdminDataReply(adminMeta, adminContextBlock);
        if (directReply) {
          return {
            reply: directReply,
            provider: 'deterministic-admin-data',
            recommendedService: null,
            scopeAllowed: true,
            scopeReason: verdict.reason,
          };
        }
      }
    }

    const systemParts = [
      NVIDIA_ADMIN_PROMPT,
      formatCatalogBlock(catalog),
      adminContextBlock,
    ].filter(Boolean);

    const ctx: AIGenerationContext = {
      catalog,
      systemContext: systemParts.join('\n\n') || undefined,
    };

    const aiResult = await generateDiagnosticResponse(history, userText, ctx);

    // Fallback offline yang relevan untuk ADMIN: ExpertEngine dirancang untuk
    // konteks customer (diagnosis perangkat) — bila NVIDIA gagal/timeout,
    // jawaban ExpertEngine akan di luar konteks operasional. Untuk admin,
    // ganti dengan ringkasan DETERMINISTIS dari blok konteks database
    // (angka asli, read-only) — penanda internal blok DIBERSIHKAN dulu agar
    // user melihat jawaban rapi, bukan sintaks blok sistem.
    if (aiResult.provider === 'expert-fallback' && adminContextBlock.trim()) {
      const cleanBlock = toUserFacingDataText(adminContextBlock);
      const fallbackReply = cleanBlock
        ? [
            'Maaf, layanan model AI (NVIDIA) sedang tidak dapat dihubungi. Sebagai gantinya, berikut ringkasan data terkini dari database sistem:',
            '',
            cleanBlock,
            '',
            '*Untuk analisis lebih lanjut, silakan coba kembali saat layanan AI telah pulih.*',
          ].join('\n')
        : 'Maaf, layanan model AI (NVIDIA) sedang tidak dapat dihubungi untuk pertanyaan ini. Silakan coba kembali beberapa saat lagi.';
      return {
        reply: sanitizeOutboundText(fallbackReply),
        provider: 'deterministic-admin-context',
        recommendedService: null,
        scopeAllowed: true,
        scopeReason: verdict.reason,
      };
    }

    // SAFETY NET ADMIN (bug P0 "yang menunggu persetujuan ada berapa?"):
    // bila router intent tak dikenali lalu provider jatuh ke ExpertEngine,
    // balasan ExpertEngine untuk pesan TANPA gejala teknis adalah sapaan
    // konsultasi pelanggan ("Maaf, saya belum menangkap masalah teknis..."
    // / lanjutan penutup percakapan) — salah konteks untuk Admin dan pernah
    // menutupi pertanyaan statistik. Alihkan ke ringkasan dashboard default
    // (bila termuat) atau panduan intent; diagnosis teknis NYATA dari
    // ExpertEngine tetap diteruskan apa adanya.
    if (
      aiResult.provider === 'expert-fallback' &&
      !adminContextBlock.trim() &&
      /belum menangkap masalah teknis|terkait pesan Anda sebelumnya/i.test(aiResult.reply || '')
    ) {
      const defaultBlock = toUserFacingDataText(await buildDefaultAdminContext('ADMIN'));
      const fallbackReply = defaultBlock
        ? [
            'Maaf, saya belum menangkap maksud pertanyaan operasional tersebut. Sebagai gantinya, berikut ringkasan terkini dari dashboard:',
            '',
            defaultBlock,
          ].join('\n')
        : 'Maaf, saya belum menangkap maksud pertanyaan operasional tersebut. Silakan ulangi lebih spesifik, misalnya: "Berapa yang menunggu persetujuan?", "Yang sedang diproses ada berapa?", "Yang baru ada berapa?" — atau tanyakan statistik customer, laporan, pendapatan, atau inventaris.';
      return {
        reply: sanitizeOutboundText(fallbackReply),
        provider: 'deterministic-admin-context',
        recommendedService: null,
        scopeAllowed: true,
        scopeReason: verdict.reason,
      };
    }

    return {
      reply: sanitizeOutboundText(aiResult.reply),
      provider: aiResult.provider ?? 'unknown',
      recommendedService: aiResult.recommendedService ?? null,
      scopeAllowed: true,
      scopeReason: verdict.reason,
    };
  }

  // 5) Role CUSTOMER → status pesanan → katalog → prosedur pemesanan →
  //    diagnosis percakapan. Konteks pesanan SELALU difilter customerId =
  //    sesi login (anti bocor).
  const orderReply = await getOrderStatusReply(session.id, userText);
  const catalogReply = orderReply ? null : getCatalogReply(userText, catalog);

  if (orderReply) {
    return {
      reply: orderReply,
      provider: 'deterministic-order-status',
      scopeAllowed: true,
      scopeReason: verdict.reason,
    };
  }
  if (catalogReply) {
    return {
      reply: catalogReply,
      provider: 'deterministic-catalog',
      scopeAllowed: true,
      scopeReason: verdict.reason,
    };
  }

  // Prosedur pemesanan (FAQ portal) → deterministik; pertanyaan prosedur
  // tidak boleh bergantung pada provider (NIM dapat timeout/gangguan).
  const procedureReply = getOrderingProcedureReply(userText);
  if (procedureReply) {
    return {
      reply: procedureReply,
      provider: 'deterministic-ordering-procedure',
      scopeAllowed: true,
      scopeReason: verdict.reason,
    };
  }

  // Diagnosis percakapan → konteks DB (katalog + pesanan milik sesi) sebagai
  // pesan SYSTEM di server; pesan user tetap bersih.
  let ctx: AIGenerationContext | undefined;
  try {
    const orderBlock = await getOrderContextBlock(session.id);
    const systemContext = [formatCatalogBlock(catalog), orderBlock]
      .filter(Boolean)
      .join('\n\n');
    ctx = { catalog, systemContext: systemContext || undefined };
  } catch (err) {
    console.error('Gagal memuat konteks DB untuk AI:', (err as Error)?.message || err);
  }

  const aiResult = await generateDiagnosticResponse(history, userText, ctx);
  return {
    reply: aiResult.reply,
    provider: aiResult.provider ?? 'unknown',
    recommendedService: aiResult.recommendedService ?? null,
    scopeAllowed: true,
    scopeReason: verdict.reason,
  };
}
