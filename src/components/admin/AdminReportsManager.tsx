'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  HardDrive,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  FileSpreadsheet,
  PieChart,
  Laptop,
  Wrench,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

interface AdminReportsManagerProps {
  orders: any[];
  inventory: any[];
  services: any[];
  customers: any[];
}

export function AdminReportsManager({
  orders,
  inventory,
  services,
  customers,
}: AdminReportsManagerProps) {
  // Filters for Financial & Transaction Log
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL', 'TODAY', '7DAYS', '30DAYS', 'THIS_MONTH', 'CUSTOM'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'price_desc' | 'price_asc'>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 1. FINANCIAL KPI CALCULATIONS
  const financialMetrics = useMemo(() => {
    // Realized Revenue (COMPLETED and DELIVERED)
    const completedOrders = orders.filter(
      (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED'
    );
    const realizedRevenue = completedOrders.reduce(
      (acc, o) => acc + (Number(o.finalPrice) || Number(o.estimatedPrice) || 0),
      0
    );

    // In-Progress / Pipeline Revenue
    const inProgressOrders = orders.filter(
      (o) => o.status !== 'COMPLETED' && o.status !== 'DELIVERED'
    );
    const pipelineRevenue = inProgressOrders.reduce(
      (acc, o) => acc + (Number(o.estimatedPrice) || Number(o.finalPrice) || 0),
      0
    );

    // Total Potential All Revenue
    const totalPotentialRevenue = realizedRevenue + pipelineRevenue;

    // Completion Rate
    const completionRate =
      orders.length > 0 ? ((completedOrders.length / orders.length) * 100).toFixed(1) : '0';

    // Average Ticket Value (ARPU)
    const averageTicketValue =
      completedOrders.length > 0 ? Math.round(realizedRevenue / completedOrders.length) : 0;

    // Inventory Valuation
    const inventoryCostValuation = inventory.reduce(
      (acc, item) => acc + (Number(item.purchasePrice) || 0) * (item.stock || 0),
      0
    );
    const inventorySellingValuation = inventory.reduce(
      (acc, item) => acc + (Number(item.sellingPrice) || 0) * (item.stock || 0),
      0
    );
    const potentialSparepartMargin = inventorySellingValuation - inventoryCostValuation;
    const totalSparepartUnits = inventory.reduce((acc, item) => acc + (item.stock || 0), 0);
    const lowStockCount = inventory.filter((item) => (item.stock || 0) <= (item.minStock || 5)).length;

    return {
      realizedRevenue,
      pipelineRevenue,
      totalPotentialRevenue,
      completedOrdersCount: completedOrders.length,
      inProgressOrdersCount: inProgressOrders.length,
      completionRate,
      averageTicketValue,
      inventoryCostValuation,
      inventorySellingValuation,
      potentialSparepartMargin,
      totalSparepartUnits,
      lowStockCount,
    };
  }, [orders, inventory]);

  // 2. MONTHLY REVENUE & TICKET TREND (6 Months)
  const monthlyTrend = useMemo(() => {
    const monthsData: { [key: string]: { label: string; revenue: number; tickets: number } } = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      monthsData[key] = { label, revenue: 0, tickets: 0 };
    }

    orders.forEach((o) => {
      const oDate = new Date(o.createdAt);
      const key = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthsData[key]) {
        monthsData[key].tickets += 1;
        if (o.status === 'COMPLETED' || o.status === 'DELIVERED') {
          monthsData[key].revenue += Number(o.finalPrice) || Number(o.estimatedPrice) || 0;
        }
      }
    });

    return Object.values(monthsData);
  }, [orders]);

  // Skala batang = data nyata dari database. Ambil maksimum riil antar bulan;
  // fallback HANYA saat semua bulan Rp0 (agar skala tetap 0–100%, bukan data karangan).
  const maxMonthlyRevenue = Math.max(...monthlyTrend.map((m) => m.revenue), 0);

  // Format ringkas untuk label nominal di layar sempit (mobile) —
  // mencegah label "Rp 1.430.000" bertabrakan antar kolom batang.
  const formatCompactIDR = (v: number) =>
    v >= 1_000_000
      ? `Rp ${(v / 1_000_000).toFixed(1).replace('.', ',')} Jt`
      : v >= 1_000
        ? `Rp ${Math.round(v / 1_000)} Rb`
        : `Rp ${v}`;

  // 3. DEVICE TYPE BREAKDOWN
  const deviceTypeBreakdown = useMemo(() => {
    const counts: { [key: string]: { count: number; revenue: number } } = {};

    orders.forEach((o) => {
      const dev = o.deviceType || 'Lainnya';
      if (!counts[dev]) counts[dev] = { count: 0, revenue: 0 };
      counts[dev].count += 1;
      if (o.status === 'COMPLETED' || o.status === 'DELIVERED') {
        counts[dev].revenue += Number(o.finalPrice) || Number(o.estimatedPrice) || 0;
      }
    });

    return Object.entries(counts)
      .map(([device, data]) => ({
        device,
        count: data.count,
        revenue: data.revenue,
        percentage: orders.length > 0 ? ((data.count / orders.length) * 100).toFixed(0) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // 4. TOP CUSTOMER SPENDERS
  const topSpenders = useMemo(() => {
    const customerMap: { [key: string]: { name: string; email: string; totalSpent: number; totalOrders: number } } = {};

    customers.forEach((c) => {
      let spent = 0;
      (c.orders || []).forEach((o: any) => {
        if (o.status === 'COMPLETED' || o.status === 'DELIVERED') {
          spent += Number(o.finalPrice) || Number(o.estimatedPrice) || 0;
        }
      });
      customerMap[c.id] = {
        name: c.name,
        email: c.email,
        totalSpent: spent,
        totalOrders: (c.orders || []).length,
      };
    });

    return Object.values(customerMap)
      .filter((c) => c.totalSpent > 0 || c.totalOrders > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);
  }, [customers]);

  // 5. FILTERING & SEARCHING TRANSACTIONS
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        order.ticketNumber.toLowerCase().includes(q) ||
        order.customer?.name?.toLowerCase().includes(q) ||
        order.customer?.email?.toLowerCase().includes(q) ||
        order.customer?.phone?.toLowerCase().includes(q) ||
        order.deviceType?.toLowerCase().includes(q) ||
        order.deviceBrand?.toLowerCase().includes(q) ||
        order.service?.name?.toLowerCase().includes(q);

      // 2. Status Filter
      let matchesStatus = true;
      if (statusFilter === 'COMPLETED_ONLY') {
        matchesStatus = order.status === 'COMPLETED' || order.status === 'DELIVERED';
      } else if (statusFilter === 'IN_PROGRESS_ONLY') {
        matchesStatus = order.status !== 'COMPLETED' && order.status !== 'DELIVERED';
      } else if (statusFilter !== 'ALL') {
        matchesStatus = order.status === statusFilter;
      }

      // 3. Service Method Filter
      const matchesMethod = methodFilter === 'ALL' || order.serviceMethod === methodFilter;

      // 4. Date Range Filter
      let matchesDate = true;
      const orderDate = new Date(order.createdAt);
      const now = new Date();

      if (dateFilter === 'TODAY') {
        matchesDate = orderDate.toDateString() === now.toDateString();
      } else if (dateFilter === '7DAYS') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= sevenDaysAgo;
      } else if (dateFilter === '30DAYS') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= thirtyDaysAgo;
      } else if (dateFilter === 'THIS_MONTH') {
        matchesDate =
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
      } else if (dateFilter === 'CUSTOM') {
        const dateStr = orderDate.toISOString().split('T')[0];
        if (customStartDate) matchesDate = matchesDate && dateStr >= customStartDate;
        if (customEndDate) matchesDate = matchesDate && dateStr <= customEndDate;
      }

      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [
    orders,
    searchQuery,
    statusFilter,
    methodFilter,
    dateFilter,
    customStartDate,
    customEndDate,
  ]);

  // 6. SORTING
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    list.sort((a, b) => {
      const priceA = Number(a.finalPrice) || Number(a.estimatedPrice) || 0;
      const priceB = Number(b.finalPrice) || Number(b.estimatedPrice) || 0;
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      switch (sortBy) {
        case 'date_asc':
          return dateA - dateB;
        case 'price_desc':
          return priceB - priceA;
        case 'price_asc':
          return priceA - priceB;
        case 'date_desc':
        default:
          return dateB - dateA;
      }
    });
    return list;
  }, [filteredOrders, sortBy]);

  // 7. PAGINATION
  const totalPages = Math.ceil(sortedOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  // Filter change helper
  const handleFilterChange = (setter: any, val: any) => {
    setter(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setMethodFilter('ALL');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  // 8. EXPORT TO CSV
  const handleExportCSV = () => {
    const headers = [
      'No. Tiket',
      'Tanggal Dibuat',
      'Nama Customer',
      'Email Customer',
      'Nomor WhatsApp',
      'Jenis Perangkat',
      'Brand / Model',
      'Layanan Servis',
      'Metode Servis',
      'Status Tiket',
      'Estimasi Biaya',
      'Biaya Final',
    ];

    const rows = sortedOrders.map((o) => [
      `"${o.ticketNumber}"`,
      `"${new Date(o.createdAt).toLocaleDateString('id-ID')}"`,
      `"${(o.customer?.name || '').replace(/"/g, '""')}"`,
      `"${(o.customer?.email || '').replace(/"/g, '""')}"`,
      `"${(o.customer?.phone || '').replace(/"/g, '""')}"`,
      `"${(o.deviceType || '').replace(/"/g, '""')}"`,
      `"${(o.deviceBrand || '').replace(/"/g, '""')}"`,
      `"${(o.service?.name || '-').replace(/"/g, '""')}"`,
      `"${o.serviceMethod || 'DROP_OFF'}"`,
      `"${o.status}"`,
      Number(o.estimatedPrice) || 0,
      Number(o.finalPrice) || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `laporan_finansial_itsm_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 9. PRINT REPORT
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" /> Pusat Laporan & Finansial Workshop
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Laporan Finansial & Kinerja Servis
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Analisis arus pendapatan bengkel IT, valuasi inventaris sparepart, performa order, dan rekapitulasi transaksi real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <Download className="w-4 h-4 text-emerald-700 dark:text-emerald-400 mr-1.5" />
            <span>Ekspor CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            className="border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
          >
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mr-1.5" />
            <span>Cetak Rekap</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Revenue — tema-aware mengikuti kartu KPI sebelahnya
            (terang di Light, gradient emerald gelap tetap di Dark) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-emerald-950/30 border border-emerald-500/30 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Pendapatan Terealisasi
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(financialMetrics.realizedRevenue)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-700/90 dark:text-emerald-400/90">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{financialMetrics.completedOrdersCount} tiket servis selesai diserahkan</span>
          </div>
        </div>

        {/* Pipeline Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
              Potensi Omset Berjalan
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(financialMetrics.pipelineRevenue)}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
            Dari {financialMetrics.inProgressOrdersCount} order dalam proses diagnosa / reparasi
          </p>
        </div>

        {/* Average Ticket Value */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Rata-rata Biaya Servis (ARPU)
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(financialMetrics.averageTicketValue)}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
            Tingkat penyelesaian: <span className="text-purple-700 dark:text-purple-300 font-semibold">{financialMetrics.completionRate}%</span>
          </p>
        </div>

        {/* Inventory Asset Valuation */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Valuasi Modal Inventaris
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(financialMetrics.inventoryCostValuation)}
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2">
            {financialMetrics.totalSparepartUnits} unit sparepart • Potensi margin{' '}
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              {formatCurrency(financialMetrics.potentialSparepartMargin)}
            </span>
          </p>
        </div>
      </div>

      {/* 3. Monthly Revenue Trend & Analysis Cards */}
      {/* Grid SEIMBANG dua baris (perbaikan akar celah kosong):
          Baris 1 — kartu grafik LEBAR PENUH dengan tinggi natural sesuai
          kontennya. Sebelumnya grafik berdampingan dengan tumpukan 2 kartu
          di kolom 5/12; kolom kanan lebih tinggi sehingga menyisakan ruang
          mati ratusan piksel di bawah grafik sebelum seksi Buku Kas.
          Baris 2 — dua kartu analisis berdampingan (6+6) dengan tinggi
          disamakan grid (equal-height card), tanpa celah di antaranya. */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Monthly Revenue Bar Chart (Full Width) */}
        <div className="md:col-span-12">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  Tren Pendapatan & Volume (6 Bulan Terakhir)
                </CardTitle>
                <CardDescription>
                  Grafik pertumbuhan realisasi omset dari tiket servis yang telah selesai
                </CardDescription>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                Prisma Live
              </span>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              {/* Area grafik tinggi MANDIRI (bukan flex-1 yang meregang):
                  300px mobile → 340px tablet → 400px desktop. */}
              <div className="h-[300px] sm:h-[340px] lg:h-[400px] flex items-end justify-between gap-2 sm:gap-3 pt-5 pb-2 px-3 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                {monthlyTrend.map((m, idx) => {
                  // Skala proporsional terhadap bulan dengan omset tertinggi (data DB).
                  const heightPercent =
                    maxMonthlyRevenue > 0 ? (m.revenue / maxMonthlyRevenue) * 100 : 0;
                  const hasRevenue = m.revenue > 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2 group h-full justify-end min-w-0"
                    >
                      {/* Nilai pendapatan — SELALU tampil di atas batang
                          (ringkas di mobile, penuh di tablet/desktop). */}
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold whitespace-nowrap ${
                          hasRevenue
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <span className="sm:hidden">{formatCompactIDR(m.revenue)}</span>
                        <span className="hidden sm:inline">{formatCurrency(m.revenue)}</span>
                      </span>

                      {/* Track batang — mengisi ruang tersisa kolom (flex-1), jadi
                          tinggi maksimal batang = tinggi area track. Bulan tanpa
                          omset memakai track garis putus-putus (baseline), tanpa
                          batang karangan. */}
                      <div
                        className={`w-full max-w-[52px] md:max-w-[64px] xl:max-w-[76px] flex-1 rounded-t-lg flex items-end justify-center ${
                          hasRevenue
                            ? 'bg-slate-200/70 dark:bg-slate-800/70'
                            : 'bg-slate-200/30 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700 border-b-0'
                        }`}
                      >
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            hasRevenue
                              ? 'bg-gradient-to-t from-emerald-600 via-teal-500 to-indigo-500 shadow-lg shadow-emerald-500/20 group-hover:from-emerald-500 group-hover:to-indigo-400'
                              : ''
                          }`}
                        />
                      </div>

                      {/* Month Label & Ticket count */}
                      <div className="text-center">
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 font-semibold block whitespace-nowrap">
                          {m.label}
                        </span>
                        <span className="text-[9px] text-slate-500 block whitespace-nowrap">
                          {m.tickets} tiket
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Stats Footer */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block">Total Omset Rekap:</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(financialMetrics.realizedRevenue)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block">Total Tiket Masuk:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {orders.length} Tiket
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 text-[10px] block">Layanan Aktif:</span>
                  <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {services.length} Paket Servis
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Device Breakdown (6 Cols) — h-full: tinggi disamakan grid
            dengan kartu di sebelahnya (equal-height, rapi). */}
        <div className="md:col-span-6">
          <Card className="border-slate-200 h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                Distribusi Kategori Perangkat
              </CardTitle>
              <CardDescription>
                Porsi volume servis dan kontribusi omset per jenis unit
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3.5 text-xs">
              {deviceTypeBreakdown.length === 0 ? (
                <p className="text-center py-6 text-slate-500">Belum ada data perangkat.</p>
              ) : (
                deviceTypeBreakdown.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        {item.device}
                      </span>
                      <div className="text-right">
                        <span className="text-slate-600 dark:text-slate-400 font-mono mr-2">
                          {item.count} order ({item.percentage}%)
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          {formatCurrency(item.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div
                        style={{ width: `${item.percentage}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Spenders (6 Cols) */}
        <div className="md:col-span-6">
          <Card className="border-slate-200 h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                Pelanggan Kontributor Terbesar
              </CardTitle>
              <CardDescription>
                Customer dengan akumulasi nilai servis tertinggi
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {topSpenders.length === 0 ? (
                <p className="text-center py-6 text-slate-500">Belum ada data kontribusi.</p>
              ) : (
                topSpenders.map((cust, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{cust.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{cust.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {formatCurrency(cust.totalSpent)}
                      </p>
                      <p className="text-[10px] text-slate-500">{cust.totalOrders} total tiket</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Interactive Financial Transaction Log Table */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Buku Kas & Riwayat Transaksi Finansial Servis
            </CardTitle>
            <CardDescription>
              Menampilkan {filteredOrders.length} dari {orders.length} seluruh transaksi tiket tercatat di database
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {(searchQuery ||
              statusFilter !== 'ALL' ||
              dateFilter !== 'ALL' ||
              methodFilter !== 'ALL' ||
              sortBy !== 'date_desc') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
              >
                <RefreshCcw className="w-3.5 h-3.5 mr-1" /> Reset Filter
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs">
              {/* Search Bar (4 Cols) */}
              <div className="lg:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari No. Tiket, Customer, Brand, Layanan..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter (3 Cols) */}
              <div className="lg:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Status Tiket</option>
                  <option value="COMPLETED_ONLY">✅ Selesai & Diserahkan (Lunas)</option>
                  <option value="IN_PROGRESS_ONLY">⏳ Sedang Dalam Proses (Pending)</option>
                  <option value="CREATED">CREATED (Order Baru)</option>
                  <option value="DEVICE_RECEIVED">DEVICE_RECEIVED (Diterima)</option>
                  <option value="CHECKING">CHECKING (Diagnosa)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Pengerjaan)</option>
                  <option value="WAITING_APPROVAL">WAITING_APPROVAL (Persetujuan)</option>
                  <option value="COMPLETED">COMPLETED (Servis Selesai)</option>
                  <option value="DELIVERED">DELIVERED (Sudah Diambil)</option>
                </select>
              </div>

              {/* Date Filter (3 Cols) */}
              <div className="lg:col-span-3">
                <select
                  value={dateFilter}
                  onChange={(e) => handleFilterChange(setDateFilter, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Semua Waktu</option>
                  <option value="TODAY">Hari Ini</option>
                  <option value="7DAYS">7 Hari Terakhir</option>
                  <option value="30DAYS">30 Hari Terakhir</option>
                  <option value="THIS_MONTH">Bulan Berjalan</option>
                  <option value="CUSTOM">Rentang Kustom...</option>
                </select>
              </div>

              {/* Sort By (2 Cols) */}
              <div className="lg:col-span-2">
                <select
                  value={sortBy}
                  onChange={(e) => handleFilterChange(setSortBy, e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="date_desc">Tanggal: Terbaru</option>
                  <option value="date_asc">Tanggal: Terlama</option>
                  <option value="price_desc">Biaya: Tertinggi</option>
                  <option value="price_asc">Biaya: Terendah</option>
                </select>
              </div>
            </div>

            {/* Custom Date Row (if CUSTOM selected) */}
            {dateFilter === 'CUSTOM' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-600 dark:text-slate-400">Dari Tanggal:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => handleFilterChange(setCustomStartDate, e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
                <span className="text-slate-600 dark:text-slate-400">Sampai:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => handleFilterChange(setCustomEndDate, e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Table — min-w-[900px] + overflow-x-auto: pada layar sempit kolom
              tetap terbaca penuh lewat scroll horizontal, bukan dipadatkan
              sampai label terbelah (mis. "Drop-Off" jadi "Drop-" / "Off"). */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full min-w-[900px] text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950/80 uppercase tracking-wider text-[10px] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">No. Tiket & Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Pelanggan</th>
                  <th className="py-3 px-4 font-semibold">Perangkat & Layanan</th>
                  <th className="py-3 px-4 font-semibold">Metode</th>
                  <th className="py-3 px-4 font-semibold">Status Servis</th>
                  <th className="py-3 px-4 pr-5 font-semibold text-right min-w-[180px]">Nilai Finansial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Tidak ada transaksi servis yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const statusInfo = getOrderStatusLabel(order.status);
                    const price = Number(order.finalPrice) || Number(order.estimatedPrice) || 0;
                    const isSettled =
                      order.status === 'COMPLETED' || order.status === 'DELIVERED';

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-200 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Ticket & Date */}
                        <td className="py-3.5 px-4 font-medium">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 inline-block mb-1 whitespace-nowrap">
                            {order.ticketNumber}
                          </div>
                          <p className="text-[10px] text-slate-500 whitespace-nowrap">
                            {formatDate(order.createdAt)}
                          </p>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900 dark:text-white max-w-[180px] truncate">
                            {order.customer?.name || 'Pelanggan'}
                          </p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 max-w-[180px] truncate">{order.customer?.phone || order.customer?.email || '-'}</p>
                        </td>

                        {/* Device & Service */}
                        <td className="py-3.5 px-4">
                          <p className="text-slate-700 dark:text-slate-200 font-medium min-w-[150px]">
                            {order.deviceType} • {order.deviceBrand}
                          </p>
                          <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                            {order.service?.name || 'Diagnosa Kerusakan'}
                          </p>
                        </td>

                        {/* Method — whitespace-nowrap: label "Drop-Off"/"Pick-Up"
                            tampil utuh satu baris, tak pernah terpecah di tanda hubung. */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center whitespace-nowrap text-[10px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                            {order.serviceMethod === 'ONSITE' ? '🚗 Onsite' : order.serviceMethod === 'PICK_UP' ? '📦 Pick-Up' : '🏢 Drop-Off'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${statusInfo.bg}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* Financial Price — min-w-[180px] + pr-5: nominal &
                            label status ("ESTIMASI BERJALAN") mendapat ruang
                            horizontal cukup; whitespace-nowrap menjaga label
                            tetap UTUH satu baris dan tidak menempel
                            apalagi terpotong di tepi kanan tabel. */}
                        <td className="py-3.5 px-4 pr-5 text-right min-w-[180px]">
                          <p
                            className={`font-black text-sm whitespace-nowrap ${
                              isSettled ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {formatCurrency(price)}
                          </p>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block whitespace-nowrap">
                            {isSettled ? 'Lunas / Selesai' : 'Estimasi Berjalan'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
            <div>
              Halaman <span className="font-semibold text-slate-900 dark:text-white">{currentPage}</span> dari{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span> ({sortedOrders.length}{' '}
              transaksi)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-3 border-slate-200 disabled:opacity-40"
              >
                Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
