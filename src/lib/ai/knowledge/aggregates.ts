/**
 * ============================================================================
 * knowledge/aggregates.ts — Utilitas Agregasi Prisma (Backend-Only)
 * ============================================================================
 *
 * Fungsi bantuan untuk query agregasi standar (count, groupBy, _sum, _avg).
 * Dipakai oleh tools.ts agar logika agregasi terpusat & reusable.
 * TIDAK diekspos ke AI secara langsung — hanya dipakai internal tools.
 * ============================================================================
 */

import prisma from '@/lib/prisma';

/* -------------------------------------------------------------------------- */
/* Tipe Hasil Agregasi                                                        */
/* -------------------------------------------------------------------------- */

export interface CountResult {
  count: number;
}

export interface SumResult<T extends string = 'value'> {
  sum: Record<T, number | null>;
}

export interface GroupByCountResult<TKey extends string = 'key'> {
  key: string;
  count: number;
}

export interface DailyBucket {
  date: string; // YYYY-MM-DD
  count: number;
  revenue: number;
}

export interface WeeklyBucket {
  weekStart: string; // YYYY-MM-DD (Monday)
  count: number;
  revenue: number;
}

export interface MonthlyBucket {
  month: string; // YYYY-MM
  count: number;
  revenue: number;
}

/* -------------------------------------------------------------------------- */
/* Helper: Rentang Waktu                                                      */
/* -------------------------------------------------------------------------- */

export function getSinceDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/* -------------------------------------------------------------------------- */
/* Agregasi Customer                                                          */
/* -------------------------------------------------------------------------- */

export async function getCustomerStats(days: number = 30): Promise<{
  totalCustomers: number;
  customersWithOrders: number;
  activeCustomers: number;
  totalRevenue: number;
  avgSpend: number;
}> {
  const since = getSinceDate(days);

  const [totalCustomers, customersWithOrders, revenueAgg] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', orders: { some: { createdAt: { gte: since } } } } }),
    prisma.serviceOrder.aggregate({
      where: { status: { in: ['COMPLETED', 'DELIVERED'] }, createdAt: { gte: since } },
      _sum: { finalPrice: true, estimatedPrice: true },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.finalPrice ?? 0) + Number(revenueAgg._sum.estimatedPrice ?? 0);
  const activeCustomers = await prisma.user.count({
    where: {
      role: 'CUSTOMER',
      orders: { some: { status: { in: ['CREATED', 'WAITING_CONFIRMATION', 'DEVICE_RECEIVED', 'CHECKING', 'IN_PROGRESS', 'WAITING_APPROVAL'] }, createdAt: { gte: since } } },
    },
  });

  return {
    totalCustomers,
    customersWithOrders,
    activeCustomers,
    totalRevenue,
    avgSpend: totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Agregasi Pesanan                                                           */
/* -------------------------------------------------------------------------- */

export async function getOrderStatsByStatus(days: number = 30): Promise<{
  byStatus: Array<{ status: string; count: number }>;
  totalOrders: number;
  totalRevenue: number;
}> {
  const since = getSinceDate(days);

  const [byStatus, revenueAgg] = await Promise.all([
    prisma.serviceOrder.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.serviceOrder.aggregate({
      where: { status: { in: ['COMPLETED', 'DELIVERED'] }, createdAt: { gte: since } },
      _sum: { finalPrice: true, estimatedPrice: true },
    }),
  ]);

  return {
    byStatus: byStatus.map((g) => ({ status: g.status, count: g._count.id })),
    totalOrders: byStatus.reduce((s, g) => s + g._count.id, 0),
    totalRevenue: Number(revenueAgg._sum.finalPrice ?? 0) + Number(revenueAgg._sum.estimatedPrice ?? 0),
  };
}

export async function getOrderTrend(days: number = 30, granularity: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<DailyBucket[] | WeeklyBucket[] | MonthlyBucket[]> {
  const since = getSinceDate(days);

  const orders = await prisma.serviceOrder.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true, finalPrice: true, estimatedPrice: true },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, { count: number; revenue: number }>();

  for (const o of orders) {
    const d = new Date(o.createdAt);
    let key: string;
    if (granularity === 'daily') key = d.toISOString().slice(0, 10);
    else if (granularity === 'weekly') {
      const ws = new Date(d);
      ws.setDate(d.getDate() - d.getDay());
      key = ws.toISOString().slice(0, 10);
    } else key = d.toISOString().slice(0, 7);

    const g = groups.get(key) ?? { count: 0, revenue: 0 };
    g.count++;
    if (o.status === 'COMPLETED' || o.status === 'DELIVERED') {
      g.revenue += Number(o.finalPrice ?? o.estimatedPrice ?? 0);
    }
    groups.set(key, g);
  }

  const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (granularity === 'daily') {
    return sorted.map(([date, v]) => ({ date, count: v.count, revenue: v.revenue }));
  } else if (granularity === 'weekly') {
    return sorted.map(([weekStart, v]) => ({ weekStart, count: v.count, revenue: v.revenue }));
  } else {
    return sorted.map(([month, v]) => ({ month, count: v.count, revenue: v.revenue }));
  }
}

/* -------------------------------------------------------------------------- */
/* Agregasi Layanan                                                           */
/* -------------------------------------------------------------------------- */

export async function getTopServices(days: number = 30, take: number = 10): Promise<Array<{
  serviceId: string;
  name: string;
  count: number;
  price: number;
  estimatedDuration: string | null;
}>> {
  const since = getSinceDate(days);

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

  return grouped.map((g) => {
    const svc = svcMap.get(g.serviceId!);
    return {
      serviceId: g.serviceId!,
      name: svc?.name ?? 'Unknown',
      count: g._count.id,
      price: Number(svc?.price ?? 0),
      estimatedDuration: svc?.estimatedDuration ?? null,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Agregasi Inventaris                                                        */
/* -------------------------------------------------------------------------- */

export async function getInventorySummary(): Promise<{
  totalItems: number;
  totalStock: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    stock: number;
    minStock: number;
    unit: string;
    purchasePrice: number;
    sellingPrice: number;
    location: string | null;
    condition: string;
  }>;
}> {
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
    orderBy: { stock: 'asc' },
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

  return {
    totalItems: allItems.length,
    totalStock,
    totalValuation,
    lowStockCount,
    outOfStockCount,
    items: allItems.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      stock: Number(i.stock),
      minStock: Number(i.minStock),
      unit: i.unit,
      purchasePrice: Number(i.purchasePrice),
      sellingPrice: Number(i.sellingPrice),
      location: i.location,
      condition: i.condition,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Agregasi Finansial                                                         */
/* -------------------------------------------------------------------------- */

export async function getRevenueSummary(days: number = 30): Promise<{
  totalEstimated: number;
  totalFinal: number;
  estimatedCount: number;
  finalCount: number;
  completedCount: number;
  avgMarginPct: number;
}> {
  const since = getSinceDate(days);

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

  return {
    totalEstimated: Number(estimatedAgg._sum.estimatedPrice ?? 0),
    totalFinal: Number(finalAgg._sum.finalPrice ?? 0),
    estimatedCount: estimatedAgg._count.id,
    finalCount: finalAgg._count.id,
    completedCount,
    avgMarginPct: marginCount > 0 ? Math.round((marginSum / marginCount) * 100) : 0,
  };
}