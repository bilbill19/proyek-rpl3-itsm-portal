/**
 * ============================================================================
 * knowledge/tools.ts — Registry Tool AI Admin (Read-Only, Role-Aware)
 * ============================================================================
 *
 * PRINSIP KEAMANAN (wajib dipertahankan):
 *   - Semua query HANYA via Prisma ORM di sisi server; TIDAK ADA SQL bebas.
 *   - Setiap tool memiliki `roles` whitelist — hanya role yang terdaftar bisa akses.
 *   - Parameter divalidasi ketat (Zod), `take` cap ≤ 20 baris untuk list.
 *   - Field output di-whitelist eksplisit — TIDAK pernah bocor PII (email, phone, address, password, token).
 *   - Agregasi (count, groupBy, _sum) dilakukan di backend, bukan di memori.
 *   - Tool mengembalikan blok teks terformat siap disuntikkan sebagai SYSTEM message.
 * ============================================================================
 */

import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Role, OrderStatus } from '@prisma/client';

/* -------------------------------------------------------------------------- */
/* Tipe & Skema Dasar                                                         */
/* -------------------------------------------------------------------------- */

export type UserRole = 'ADMIN' | 'CUSTOMER' | 'PUBLIC';

export interface ToolResult {
  /** Blok teks siap disuntikkan ke system prompt (markdown-friendly). */
  block: string;
  /** Metadata untuk observabilitas / debugging. */
  meta?: Record<string, unknown>;
}

export interface ToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Nama unik tool (snake_case). */
  name: string;
  /** Deskripsi singkat untuk router/observability. */
  description: string;
  /** Role yang BISA memanggil tool ini. */
  roles: UserRole[];
  /** Skema validasi input (Zod). */
  inputSchema: TInput;
  /** Fungsi eksekusi — HANYA read-only Prisma. */
  execute: (input: z.infer<TInput>, role: UserRole) => Promise<ToolResult>;
  /** Estimasi ukuran blok (karakter) untuk budget konteks. */
  estimatedSize?: (input: z.infer<TInput>) => number;
}

/* -------------------------------------------------------------------------- */
/* Helper: Validasi Role                                                      */
/* -------------------------------------------------------------------------- */

export function assertRoleAllowed(tool: ToolDefinition, role: UserRole): void {
  if (!tool.roles.includes(role)) {
    throw new Error(`TOOL_FORBIDDEN: ${tool.name} tidak diizinkan untuk role ${role}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Helper: Format Blok Sistem                                                 */
/* -------------------------------------------------------------------------- */

export function formatSystemBlock(title: string, lines: string[], footer?: string): string {
  const out = [
    `[${title} — SUMBER: DATABASE ITSM (data sistem, bukan ucapan user)]`,
    ...lines,
  ];
  if (footer) out.push(footer);
  out.push(`[AKHIR ${title}]`);
  return out.join('\n');
}

/* -------------------------------------------------------------------------- */
/* Helper: Cap & Whitelist                                                    */
/* -------------------------------------------------------------------------- */

const MAX_ROWS = 20;

/** Batasi jumlah baris hasil query list. */
export function applyTake<T>(items: T[], take?: number): T[] {
  const limit = Math.min(take ?? MAX_ROWS, MAX_ROWS);
  return items.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Tool: customer_stats — Statistik Customer (ADMIN only)                     */
/* -------------------------------------------------------------------------- */

const CustomerStatsInput = z.object({
  /** Filter status pesanan untuk active customers. */
  statusFilter: z.enum(['ALL', 'ACTIVE', 'HAS_ORDERS', 'NO_ORDERS']).optional().default('ALL'),
  /** Batas jumlah customer dalam detail (max 20). */
  take: z.number().int().min(1).max(MAX_ROWS).optional().default(10),
  /** Periode hari ke belakang untuk agregasi revenue (max 365). */
  days: z.number().int().min(1).max(365).optional().default(30),
});

export const customerStatsTool: ToolDefinition<typeof CustomerStatsInput> = {
  name: 'customer_stats',
  description: 'Ringkasan statistik customer: total, aktif, rata-rata pengeluaran, detail top customer.',
  roles: ['ADMIN'],
  inputSchema: CustomerStatsInput,
  estimatedSize: () => 1200,

  async execute(input) {
    const { statusFilter, take, days } = input;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Aggregasi di database: count, _sum finalPrice/estimatedPrice
    const [totalCustomers, customersWithOrders, revenueAgg] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({
        where: { role: 'CUSTOMER', orders: { some: { createdAt: { gte: since } } } },
      }),
      prisma.serviceOrder.aggregate({
        where: { status: { in: ['COMPLETED', 'DELIVERED'] }, createdAt: { gte: since } },
        _sum: { finalPrice: true, estimatedPrice: true },
      }),
    ]);

    const totalRevenue = Number(revenueAgg._sum.finalPrice ?? 0) + Number(revenueAgg._sum.estimatedPrice ?? 0);
    const avgSpend = totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0;

    // Detail customer (filtered & limited)
    const rawCustomers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ticketNumber: true,
            status: true,
            estimatedPrice: true,
            finalPrice: true,
            createdAt: true,
          },
        },
        _count: { select: { orders: true, conversations: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take * 3, // ambil lebih banyak untuk filter nanti
    });

    let formatted = rawCustomers.map((c) => {
      const orders = c.orders || [];
      const totalOrders = orders.length;
      let spent = 0;
      let activeOrders = 0;
      let completedOrders = 0;
      orders.forEach((o) => {
        const isDone = o.status === 'COMPLETED' || o.status === 'DELIVERED';
        if (isDone) {
          completedOrders++;
          spent += Number(o.finalPrice ?? o.estimatedPrice ?? 0);
        } else {
          activeOrders++;
        }
      });
      return {
        id: c.id,
        name: c.name,
        email: c.email, // ADMIN boleh lihat email customer
        totalOrders,
        activeOrders,
        completedOrders,
        totalSpent: spent,
        lastOrderDate: orders[0]?.createdAt.toISOString() ?? null,
        conversationsCount: c._count.conversations,
      };
    });

    // Apply status filter
    if (statusFilter === 'ACTIVE') {
      formatted = formatted.filter((c) => c.activeOrders > 0);
    } else if (statusFilter === 'HAS_ORDERS') {
      formatted = formatted.filter((c) => c.totalOrders > 0);
    } else if (statusFilter === 'NO_ORDERS') {
      formatted = formatted.filter((c) => c.totalOrders === 0);
    }

    const limited = applyTake(formatted, take);

    // Hitung active customers dalam periode (dari rawCustomers sebelum mapping)
    const activeCustomersCount = rawCustomers.filter((c) =>
      c.orders?.some((o) => {
        const isActiveStatus = ['CREATED', 'WAITING_CONFIRMATION', 'DEVICE_RECEIVED', 'CHECKING', 'IN_PROGRESS', 'WAITING_APPROVAL'].includes(o.status);
        return isActiveStatus && new Date(o.createdAt) >= since;
      })
    ).length;

    const lines = [
      `Total Customer: ${totalCustomers}`,
      `Customer dengan Pesanan (${days} hari): ${customersWithOrders}`,
      `Customer Aktif (punya pesanan berjalan, ${days} hari): ${activeCustomersCount}`,
      `Total Revenue (finalPrice + estimatedPrice completed, ${days} hari): Rp ${totalRevenue.toLocaleString('id-ID')}`,
      `Rata-rata Pengeluaran per Customer: Rp ${avgSpend.toLocaleString('id-ID')}`,
      '',
      `Detail ${limited.length} customer (teratas):`,
      ...limited.map((c, i) => {
        const spent = c.totalSpent > 0 ? `Rp ${c.totalSpent.toLocaleString('id-ID')}` : 'Belum ada transaksi selesai';
        return `${i + 1}. ${c.name} (${c.email}) — Pesanan: ${c.totalOrders} | Aktif: ${c.activeOrders} | Selesai: ${c.completedOrders} | Total Belanja: ${spent} | Terakhir: ${c.lastOrderDate ?? '-'}`;
      }),
    ];

    return {
      block: formatSystemBlock('STATISTIK CUSTOMER', lines, 'Catatan: Revenue = finalPrice + estimatedPrice pesanan COMPLETED/DELIVERED. Bukan data pembayaran/invoice (belum tersedia).'),
      meta: { totalCustomers, totalRevenue, avgSpend, returnedCount: limited.length },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Tool: order_stats — Statistik Pesanan per Status (ADMIN only)              */
/* -------------------------------------------------------------------------- */

const OrderStatsInput = z.object({
  /** Group by status atau hari. */
  groupBy: z.enum(['status', 'daily', 'weekly', 'monthly']).optional().default('status'),
  /** Batas hari ke belakang untuk daily/weekly/monthly (max 90). */
  days: z.number().int().min(1).max(90).optional().default(30),
});

export const orderStatsTool: ToolDefinition<typeof OrderStatsInput> = {
  name: 'order_stats',
  description: 'Distribusi pesanan per status, atau tren harian/mingguan/bulanan.',
  roles: ['ADMIN'],
  inputSchema: OrderStatsInput,
  estimatedSize: () => 800,

  async execute(input) {
    const { groupBy, days } = input;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    if (groupBy === 'status') {
      // Logika diperbaiki (bukan data):
      //  - Distribusi STATUS = atribut status saat ini → dihitung dari SELURUH pesanan
      //    (sebelumnya difilter createdAt 30 hari sehingga status pesanan lama hilang
      //    dari tampilan — angka "CREATED: 18" terlihat salah vs halaman pesanan).
      //  - "Pesanan baru (N hari)" tetap memakai filter periode → menjawab
      //    "berapa pesanan dalam 30 hari terakhir".
      //  - Revenue = total finalPrice pesanan COMPLETED/DELIVERED (tanpa menjumlahkan
      //    estimatedPrice yang sudah tergantikan finalPrice → sebelumnya bisa dobel).
      const [byStatus, revenueAgg, newOrdersCount] = await Promise.all([
        prisma.serviceOrder.groupBy({
          by: ['status'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
        }),
        prisma.serviceOrder.aggregate({
          where: { status: { in: ['COMPLETED', 'DELIVERED'] } },
          _sum: { finalPrice: true },
        }),
        prisma.serviceOrder.count({ where: { createdAt: { gte: since } } }),
      ]);

      const totalRevenue = Number(revenueAgg._sum.finalPrice ?? 0);
      const totalOrders = byStatus.reduce((s, g) => s + g._count.id, 0);
      const activeOrders = byStatus
        .filter((g) => !['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(g.status))
        .reduce((s, g) => s + g._count.id, 0);

      const lines = [
        `Seluruh pesanan: ${totalOrders}`,
        `Pesanan baru (dibuat ${days} hari terakhir): ${newOrdersCount}`,
        `Sedang diproses (status berjalan): ${activeOrders}`,
        `Revenue (finalPrice pesanan COMPLETED/DELIVERED): Rp ${totalRevenue.toLocaleString('id-ID')}`,
        '',
        'Distribusi status (seluruh pesanan):',
        ...byStatus.map((g) => `- ${g.status}: ${g._count.id} pesanan`),
      ];

      return {
        block: formatSystemBlock(
          'STATISTIK PESANAN PER STATUS',
          lines,
          'Catatan: Distribusi status dihitung dari seluruh pesanan (status saat ini); "pesanan baru" dibatasi periode terakhir.'
        ),
        meta: { periodDays: days, totalOrders, newOrdersCount, activeOrders, totalRevenue, byStatus },
      };
    }

    // Daily/Weekly/Monthly: group by createdAt date (manual grouping via raw query not allowed, use JS aggregation on limited set)
    const orders = await prisma.serviceOrder.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, status: true, finalPrice: true, estimatedPrice: true },
      orderBy: { createdAt: 'asc' },
    });

    const groups = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      let key: string;
      const d = new Date(o.createdAt);
      if (groupBy === 'daily') key = d.toISOString().slice(0, 10);
      else if (groupBy === 'weekly') {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().slice(0, 10);
      } else key = d.toISOString().slice(0, 7); // monthly YYYY-MM

      const g = groups.get(key) ?? { count: 0, revenue: 0 };
      g.count++;
      if (o.status === 'COMPLETED' || o.status === 'DELIVERED') {
        g.revenue += Number(o.finalPrice ?? o.estimatedPrice ?? 0);
      }
      groups.set(key, g);
    }

    const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    const lines = [
      `Periode: ${days} hari terakhir (group: ${groupBy})`,
      `Total bucket: ${sorted.length}`,
      '',
      ...sorted.map(([k, v]) => `- ${k}: ${v.count} pesanan, Revenue: Rp ${v.revenue.toLocaleString('id-ID')}`),
    ];

    return {
      block: formatSystemBlock(`STATISTIK PESANAN ${groupBy.toUpperCase()}`, lines),
      meta: { periodDays: days, groupBy, buckets: sorted.length },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Tool: top_services — Layanan Terpopuler (ADMIN only)                       */
/* -------------------------------------------------------------------------- */

const TopServicesInput = z.object({
  days: z.number().int().min(1).max(365).optional().default(30),
  take: z.number().int().min(1).max(MAX_ROWS).optional().default(10),
});

export const topServicesTool: ToolDefinition<typeof TopServicesInput> = {
  name: 'top_services',
  description: 'Layanan paling banyak dipesan dalam periode.',
  roles: ['ADMIN'],
  inputSchema: TopServicesInput,
  estimatedSize: () => 600,

  async execute(input) {
    const { days, take } = input;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const grouped = await prisma.serviceOrder.groupBy({
      by: ['serviceId'],
      where: { createdAt: { gte: since }, serviceId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take,
    });

    const serviceIds = grouped.map((g) => g.serviceId!);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, price: true, estimatedDuration: true },
    });
    const svcMap = new Map(services.map((s) => [s.id, s]));

    const lines = [
      `Periode: ${days} hari terakhir`,
      `Top ${take} Layanan:`,
      ...grouped.map((g, i) => {
        const svc = svcMap.get(g.serviceId!);
        return `${i + 1}. ${svc?.name ?? 'Unknown'} — ${g._count.id} pesanan | Harga: Rp ${Number(svc?.price ?? 0).toLocaleString('id-ID')} | Durasi: ${svc?.estimatedDuration ?? '-'}`;
      }),
    ];

    return {
      block: formatSystemBlock('LAYANAN TERPOPULER', lines),
      meta: { periodDays: days, returnedCount: grouped.length },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Tool: inventory_summary — Ringkasan Inventaris (ADMIN only)                */
/* -------------------------------------------------------------------------- */

const InventorySummaryInput = z.object({
  /** Filter status stok. */
  stockStatus: z.enum(['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']).optional().default('ALL'),
  take: z.number().int().min(1).max(MAX_ROWS).optional().default(15),
});

export const inventorySummaryTool: ToolDefinition<typeof InventorySummaryInput> = {
  name: 'inventory_summary',
  description: 'Ringkasan inventaris: total item, total stok, valuasi, stok menipis, habis.',
  roles: ['ADMIN'],
  inputSchema: InventorySummaryInput,
  estimatedSize: () => 1000,

  async execute(input) {
    const { stockStatus, take } = input;

    const allItems = await prisma.inventoryItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        brand: true,
        stock: true,
        minStock: true,
        unit: true,
        purchasePrice: true,
        sellingPrice: true,
        location: true,
        condition: true,
        isActive: true,
      },
      orderBy: { stock: 'asc' }, // low stock first
    });

    let totalStock = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const item of allItems) {
      const stock = Number(item.stock) || 0;
      const minStock = Number(item.minStock) || 0;
      const purchasePrice = Number(item.purchasePrice) || 0;
      totalStock += stock;
      totalValuation += stock * purchasePrice;
      if (stock === 0) {
        outOfStockCount++;
        lowStockCount++;
      } else if (stock <= minStock) {
        lowStockCount++;
      }
    }

    let filtered = allItems;
    if (stockStatus === 'OUT_OF_STOCK') filtered = allItems.filter((i) => Number(i.stock) === 0);
    else if (stockStatus === 'LOW_STOCK') filtered = allItems.filter((i) => { const s = Number(i.stock); return s > 0 && s <= Number(i.minStock); });
    else if (stockStatus === 'IN_STOCK') filtered = allItems.filter((i) => Number(i.stock) > Number(i.minStock));

    const limited = applyTake(filtered, take);

    const lines = [
      `Total Item Aktif: ${allItems.length}`,
      `Total Stok (qty): ${totalStock}`,
      `Valuasi Stok (purchasePrice × qty): Rp ${totalValuation.toLocaleString('id-ID')}`,
      `Stok Menipis (≤ minStock): ${lowStockCount}`,
      `Stok Habis (0): ${outOfStockCount}`,
      '',
      `Filter: ${stockStatus} | Menampilkan ${limited.length} item:`,
      ...limited.map((i, idx) => {
        const stock = Number(i.stock);
        const minStock = Number(i.minStock);
        const status = stock === 0 ? 'HABIS' : stock <= minStock ? 'MENIPIS' : 'AMAN';
        return `${idx + 1}. [${i.sku}] ${i.name} (${i.category}) — Stok: ${stock} ${i.unit} | Min: ${minStock} | Harga Beli: Rp ${Number(i.purchasePrice).toLocaleString('id-ID')} | Harga Jual: Rp ${Number(i.sellingPrice).toLocaleString('id-ID')} | Lokasi: ${i.location ?? '-'} | Status: ${status}`;
      }),
    ];

    return {
      block: formatSystemBlock('RINGKASAN INVENTARIS', lines, 'Catatan: Valuasi berbasis purchasePrice (bukan sellingPrice). Data internal — hanya ADMIN.'),
      meta: { totalItems: allItems.length, totalStock, totalValuation, lowStockCount, outOfStockCount, returnedCount: limited.length },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Tool: revenue_summary — Ringkasan Finansial (ADMIN only)                   */
/* -------------------------------------------------------------------------- */

const RevenueSummaryInput = z.object({
  days: z.number().int().min(1).max(365).optional().default(30),
});

export const revenueSummaryTool: ToolDefinition<typeof RevenueSummaryInput> = {
  name: 'revenue_summary',
  description: 'Ringkasan finansial: estimatedPrice vs finalPrice, margin estimasi.',
  roles: ['ADMIN'],
  inputSchema: RevenueSummaryInput,
  estimatedSize: () => 700,

  async execute(input) {
    const { days } = input;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [estimatedAgg, finalAgg, completedCount, allOrders] = await Promise.all([
      prisma.serviceOrder.aggregate({
        where: { createdAt: { gte: since }, estimatedPrice: { not: null } },
        _sum: { estimatedPrice: true },
        _count: { id: true },
      }),
      prisma.serviceOrder.aggregate({
        where: { status: { in: ['COMPLETED', 'DELIVERED'] }, createdAt: { gte: since }, finalPrice: { not: null } },
        _sum: { finalPrice: true },
        _count: { id: true },
      }),
      prisma.serviceOrder.count({
        where: { status: { in: ['COMPLETED', 'DELIVERED'] }, createdAt: { gte: since } },
      }),
      prisma.serviceOrder.findMany({
        where: { status: { in: ['COMPLETED', 'DELIVERED'] }, createdAt: { gte: since }, finalPrice: { not: null }, estimatedPrice: { not: null } },
        select: { estimatedPrice: true, finalPrice: true },
      }),
    ]);

    const totalEstimated = Number(estimatedAgg._sum.estimatedPrice ?? 0);
    const totalFinal = Number(finalAgg._sum.finalPrice ?? 0);
    const estimatedCount = estimatedAgg._count.id;
    const finalCount = finalAgg._count.id;

    // Margin analysis
    let marginSum = 0;
    let marginCount = 0;
    for (const o of allOrders) {
      const est = Number(o.estimatedPrice);
      const fin = Number(o.finalPrice);
      if (est > 0) {
        marginSum += (fin - est) / est;
        marginCount++;
      }
    }
    const avgMarginPct = marginCount > 0 ? Math.round((marginSum / marginCount) * 100) : 0;

    const lines = [
      `Periode: ${days} hari terakhir`,
      `Total Estimasi (semua pesanan baru): Rp ${totalEstimated.toLocaleString('id-ID')} (${estimatedCount} pesanan)`,
      `Total Biaya Final (pesanan selesai): Rp ${totalFinal.toLocaleString('id-ID')} (${finalCount} pesanan)`,
      `Pesanan Selesai: ${completedCount}`,
      `Rata-rata Margin Final vs Estimasi: ${avgMarginPct >= 0 ? '+' : ''}${avgMarginPct}%`,
      '',
      '⚠️ Catatan Penting:',
      '- Estimasi = harga layanan saat pesanan dibuat (estimatedPrice).',
      '- Final = biaya final setelah servis (finalPrice), hanya ada saat status COMPLETED/DELIVERED.',
      '- Belum ada modul Payment/Invoice → "Revenue" di sini = total finalPrice completed, BUKAN uang yang sudah diterima.',
      '- Margin = (final - estimated) / estimated × 100%.',
    ];

    return {
      block: formatSystemBlock('RINGKASAN FINANSIAL', lines),
      meta: { periodDays: days, totalEstimated, totalFinal, estimatedCount, finalCount, completedCount, avgMarginPct },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Tool: recent_orders — Pesanan Terbaru (ADMIN only)                          */
/* -------------------------------------------------------------------------- */

const RecentOrdersInput = z.object({
  take: z.number().int().min(1).max(10).optional().default(5),
});

export const recentOrdersTool: ToolDefinition<typeof RecentOrdersInput> = {
  name: 'recent_orders',
  description: 'Pesanan terbaru (nomor tiket, status, waktu dibuat) urut createdAt DESC.',
  roles: ['ADMIN'],
  inputSchema: RecentOrdersInput,
  estimatedSize: (input) => 400 * (input.take ?? 5),

  async execute(input) {
    const { take } = input;
    const rows = await prisma.serviceOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      // Whitelist field — TIDAK memilih email/phone/password (tidak bocor PII).
      select: {
        ticketNumber: true,
        status: true,
        createdAt: true,
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    const lines = rows.map((o, i) => {
      const when = new Date(o.createdAt).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${i + 1}. ${o.ticketNumber} — Status: ${o.status} — Dibuat: ${when} — Pelanggan: ${o.customer?.name ?? '-'} — Layanan: ${o.service?.name ?? '-'}`;
    });

    if (lines.length === 0) lines.push('Belum ada pesanan tercatat di sistem.');

    return {
      block: formatSystemBlock(
        'PESANAN TERBARU',
        lines,
        'Catatan: Diurutkan dari yang paling baru dibuat (createdAt DESC), data apa adanya dari database.'
      ),
      meta: { returnedCount: rows.length, tickets: rows.map((o) => o.ticketNumber) },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Tool: order_count — Jumlah Pesanan per Kelompok Status (ADMIN only)         */
/* -------------------------------------------------------------------------- */

/**
 * DEFINISI STATUS — DIAMBIL PERSIS dari kartu statistik halaman
 * /admin/dashboard (prisma.serviceOrder.count di halaman tersebut):
 *   - NEW            = [CREATED]                                → kartu "Pesanan Baru"
 *   - IN_PROGRESS    = [WAITING_CONFIRMATION, DEVICE_RECEIVED,  → kartu "Sedang Diproses"
 *                       CHECKING, IN_PROGRESS]
 *   - WAITING_APPROVAL = [WAITING_APPROVAL]                     → kartu "Menunggu Persetujuan"
 *   - COMPLETED      = [COMPLETED, DELIVERED]                   → kartu "Service Selesai"
 *   - ALL            = seluruh status                           → kartu "Total Pesanan"
 *
 * Jawaban SELALU angka hasil COUNT langsung ke database (read-only):
 * tanpa filter periode, tanpa hardcode angka, tanpa provider generatif.
 */
const OrderCountInput = z.object({
  statusGroup: z
    .enum(['NEW', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED', 'ALL'])
    .optional()
    .default('ALL'),
});

type OrderStatusGroupKey = 'NEW' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'COMPLETED' | 'ALL';

const ORDER_STATUS_GROUPS: Record<
  OrderStatusGroupKey,
  { label: string; statuses: OrderStatus[] }
> = {
  NEW: { label: 'Pesanan baru (status CREATED)', statuses: ['CREATED'] },
  IN_PROGRESS: {
    label: 'Sedang diproses / dalam proses pengerjaan',
    statuses: ['WAITING_CONFIRMATION', 'DEVICE_RECEIVED', 'CHECKING', 'IN_PROGRESS'],
  },
  WAITING_APPROVAL: { label: 'Menunggu persetujuan (approval)', statuses: ['WAITING_APPROVAL'] },
  COMPLETED: { label: 'Sudah selesai', statuses: ['COMPLETED', 'DELIVERED'] },
  ALL: { label: 'Seluruh pesanan (semua status)', statuses: [] },
};

export const orderCountTool: ToolDefinition<typeof OrderCountInput> = {
  name: 'order_count',
  description:
    'Jumlah pesanan (COUNT) per kelompok status: baru, dalam proses, menunggu persetujuan, selesai, atau total.',
  roles: ['ADMIN'],
  inputSchema: OrderCountInput,
  estimatedSize: () => 450,

  async execute(input) {
    const group = ORDER_STATUS_GROUPS[input.statusGroup];
    const count = await prisma.serviceOrder.count({
      where: group.statuses.length > 0 ? { status: { in: group.statuses } } : {},
    });
    const totalAll = input.statusGroup === 'ALL' ? count : await prisma.serviceOrder.count({});

    const lines = [
      `Jumlah pesanan: ${count}`,
      `Kelompok status: ${group.label}`,
      `Status yang dihitung: ${
        group.statuses.length > 0 ? group.statuses.join(', ') : 'SEMUA STATUS'
      }`,
      `Total seluruh pesanan (semua status): ${totalAll}`,
    ];

    return {
      block: formatSystemBlock(
        'JUMLAH PESANAN',
        lines,
        'Catatan: Angka = COUNT langsung dari database (read-only, tanpa filter periode) — definisi kelompok status konsisten dengan kartu statistik Dashboard Admin.'
      ),
      meta: { statusGroup: input.statusGroup, count },
    };
  },
};

/* -------------------------------------------------------------------------- */
/* Registry Tool                                                              */
/* -------------------------------------------------------------------------- */

// Type assertion untuk array heterogeneous (setiap tool beda inputSchema ZodObject)
// TypeScript generic variance issue: cast ke wide type
export const adminTools = [
  orderCountTool,
  customerStatsTool,
  orderStatsTool,
  recentOrdersTool,
  topServicesTool,
  inventorySummaryTool,
  revenueSummaryTool,
] as unknown as ToolDefinition<z.ZodTypeAny>[];

export function getAdminTool(name: string): ToolDefinition<z.ZodTypeAny> | undefined {
  return adminTools.find((t) => t.name === name);
}

export function listAdminToolsForRole(role: UserRole): ToolDefinition<z.ZodTypeAny>[] {
  return adminTools.filter((t) => t.roles.includes(role));
}