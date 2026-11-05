import React from 'react';
import Link from 'next/link';
import {
  Users,
  ClipboardList,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  Laptop,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  Activity,
  User,
  Phone,
  Mail,
  PieChart,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // 1. Proteksi RBAC Server-Side: Hanya ADMIN yang dapat mengakses
  const session = await requireAdmin();

  // 2. Ambil data analitik & statistik langsung dari Database PostgreSQL via Prisma
  let totalCustomers = 0;
  let totalOrders = 0;
  let newOrders = 0;
  let inProgressOrders = 0;
  let waitingApprovalOrders = 0;
  let completedOrders = 0;

  let recentOrders: any[] = [];
  let recentCustomers: any[] = [];
  let allOrdersForChart: any[] = [];

  try {
    const [
      customersCount,
      ordersCount,
      newCount,
      inProgCount,
      waitingApprovalCount,
      completedCount,
      latestOrders,
      latestUsers,
      allOrders,
    ] = await Promise.all([
      // 1. Total Customer
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      // 2. Total Pesanan
      prisma.serviceOrder.count(),
      // 3. Pesanan Baru (CREATED)
      prisma.serviceOrder.count({ where: { status: 'CREATED' } }),
      // 4. Sedang Diproses (DEVICE_RECEIVED, CHECKING, IN_PROGRESS)
      prisma.serviceOrder.count({
        where: {
          status: {
            in: ['DEVICE_RECEIVED', 'CHECKING', 'IN_PROGRESS', 'WAITING_CONFIRMATION'],
          },
        },
      }),
      // 5. Menunggu Persetujuan (WAITING_APPROVAL)
      prisma.serviceOrder.count({ where: { status: 'WAITING_APPROVAL' } }),
      // 6. Service Selesai (COMPLETED, DELIVERED)
      prisma.serviceOrder.count({
        where: {
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
      }),
      // Pesanan Terbaru (5 teratas)
      prisma.serviceOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          service: true,
        },
      }),
      // Customer Terbaru (5 teratas)
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { orders: true } },
        },
      }),
      // Data untuk Grafik & Distribusi
      prisma.serviceOrder.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          estimatedPrice: true,
          finalPrice: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    totalCustomers = customersCount;
    totalOrders = ordersCount;
    newOrders = newCount;
    inProgressOrders = inProgCount;
    waitingApprovalOrders = waitingApprovalCount;
    completedOrders = completedCount;

    recentOrders = latestOrders;
    recentCustomers = latestUsers;
    allOrdersForChart = allOrders;
  } catch (error) {
    console.error('Error fetching admin dashboard statistics:', error);
  }

  // 3. Kalkulasi Grafik Jumlah Pesanan (7 Hari Terakhir)
  const last7Days: { dateStr: string; label: string; count: number }[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short' });
    const dayDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
    const dateStr = d.toISOString().split('T')[0];

    const countOnDay = allOrdersForChart.filter((o) => {
      const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
      return orderDate === dateStr;
    }).length;

    last7Days.push({
      dateStr,
      label: `${dayName}, ${dayDate}`,
      count: countOnDay,
    });
  }

  const maxChartCount = Math.max(...last7Days.map((d) => d.count), 4);

  // 4. Kalkulasi Status Distribusi Pesanan (8 Status)
  const statusDistributionList = [
    { key: 'CREATED', label: 'Pesanan Baru (Created)', count: 0, color: 'bg-indigo-500' },
    { key: 'WAITING_CONFIRMATION', label: 'Menunggu Konfirmasi', count: 0, color: 'bg-amber-500' },
    { key: 'DEVICE_RECEIVED', label: 'Perangkat Diterima', count: 0, color: 'bg-blue-500' },
    { key: 'CHECKING', label: 'Diagnosa & Analisa', count: 0, color: 'bg-purple-500' },
    { key: 'IN_PROGRESS', label: 'Sedang Dikerjakan', count: 0, color: 'bg-cyan-500' },
    { key: 'WAITING_APPROVAL', label: 'Menunggu Persetujuan', count: 0, color: 'bg-orange-500' },
    { key: 'COMPLETED', label: 'Service Selesai', count: 0, color: 'bg-emerald-500' },
    { key: 'DELIVERED', label: 'Sudah Diserahkan', count: 0, color: 'bg-teal-500' },
  ];

  statusDistributionList.forEach((item) => {
    item.count = allOrdersForChart.filter((o) => o.status === item.key).length;
  });

  // 5. 6 KPI Cards Data
  const kpiStats = [
    {
      title: 'Total Customer',
      value: totalCustomers,
      desc: 'Pelanggan aktif terdaftar',
      icon: Users,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
    {
      title: 'Total Pesanan',
      value: totalOrders,
      desc: 'Seluruh tiket perbaikan',
      icon: ClipboardList,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Pesanan Baru',
      value: newOrders,
      desc: 'Menunggu verifikasi teknisi',
      icon: Sparkles,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Sedang Diproses',
      value: inProgressOrders,
      desc: 'Dalam diagnosa / reparasi',
      icon: Clock,
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Menunggu Persetujuan',
      value: waitingApprovalOrders,
      desc: 'Approval part / biaya customer',
      icon: AlertCircle,
      color: 'text-orange-700 dark:text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
    },
    {
      title: 'Service Selesai',
      value: completedOrders,
      desc: 'Siap diambil / bergaransi',
      icon: CheckCircle2,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Pusat Kontrol Administrator
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dashboard Operasional IT Service
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Monitoring performa layanan, beban antrian servis teknisi, dan pertumbuhan pelanggan real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/orders">
            <Button size="sm" className="shadow-lg shadow-indigo-600/20">
              <ClipboardList className="w-4 h-4" />
              <span>Kelola Semua Tiket ({totalOrders})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Statistik Utama (KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-lg group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{stat.title}</span>
                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{stat.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Grafik Jumlah Pesanan & Status Distribusi Pesanan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Grafik Jumlah Pesanan */}
        <div className="lg:col-span-7 h-full">
          <Card className="border-slate-200 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Grafik Jumlah Pesanan (7 Hari Terakhir)
                </CardTitle>
                <CardDescription>Tren volume pemesanan servis harian dari customer</CardDescription>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                Live Data
              </span>
            </CardHeader>

            {/* flex-1 + flex-col: sisa tinggi baris grid terserap ke area
                grafik, bukan menjadi ruang kosong di dalam kartu. */}
            <CardContent className="pt-4 space-y-6 flex-1 flex flex-col">
              {/* Bar Chart Visualization — min-h-[12rem]: tinggi natural minimum. */}
              <div className="flex-1 min-h-[12rem] flex items-end justify-between gap-2 pt-6 pb-2 px-2 bg-slate-100 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800/80">
                {last7Days.map((day, idx) => {
                  const heightPercent = maxChartCount > 0 ? (day.count / maxChartCount) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      {/* Count Tooltip */}
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {day.count}
                      </span>
                      {/* Visual Bar */}
                      <div className="w-full max-w-[36px] bg-slate-500 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end justify-center h-32">
                        <div
                          style={{ height: `${Math.max(8, heightPercent)}%` }}
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            day.count > 0
                              ? 'bg-gradient-to-t from-indigo-600 to-purple-500 group-hover:from-indigo-500 group-hover:to-purple-400 shadow-lg shadow-indigo-600/30'
                              : 'bg-slate-500 dark:bg-slate-800'
                          }`}
                        />
                      </div>
                      {/* Day Label */}
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium truncate text-center block">
                        {day.label.split(',')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Metrics Footer */}
              <div className="grid grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800/80">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block">Total 7 Hari:</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {last7Days.reduce((acc, d) => acc + d.count, 0)} Tiket
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block">Rata-rata Harian:</span>
                  <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                    {(last7Days.reduce((acc, d) => acc + d.count, 0) / 7).toFixed(1)} / hari
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
                  <span className="text-slate-500 text-[10px] block">Status Pengerjaan:</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                    {completedOrders} Selesai
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Cols: Status Distribusi Pesanan */}
        <div className="lg:col-span-5 h-full">
          {/* Tanpa justify-between: daftar status mengalir natural dari atas
              (ruang kosong tak tersebar di antara judul & isi kartu). */}
          <Card className="border-slate-200 h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Status Distribusi Pesanan
              </CardTitle>
              <CardDescription>Persentase & kuantitas tiket berdasarkan tahap perbaikan</CardDescription>
            </CardHeader>

            {/* flex-1 + justify-between: bila kolom kiri lebih tinggi, sisa
                tinggi tersebar merata ANTAR baris status (bukan di satu titik). */}
            <CardContent className="space-y-3 text-xs flex-1 flex flex-col justify-between">
              {totalOrders === 0 ? (
                <div className="text-center py-10 text-slate-500">Belum ada pesanan untuk dianalisa.</div>
              ) : (
                statusDistributionList.map((st) => {
                  const percentage = totalOrders > 0 ? ((st.count / totalOrders) * 100).toFixed(0) : '0';
                  return (
                    <div key={st.key} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${st.color}`} />
                          {st.label}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-mono">
                          {st.count} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div
                          style={{ width: `${percentage}%` }}
                          className={`h-full ${st.color} rounded-full transition-all duration-300`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Grid: Pesanan Terbaru & Customer Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Pesanan Terbaru */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Pesanan Terbaru
                </CardTitle>
                <CardDescription>Daftar 5 pengajuan servis terakhir yang masuk ke workshop</CardDescription>
              </div>
              <Link href="/admin/orders" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold inline-flex items-center gap-1 shrink-0 whitespace-nowrap">
                Semua Tiket <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </CardHeader>

            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Laptop className="w-8 h-8 mx-auto text-slate-700 dark:text-slate-500" />
                  <p className="text-xs">Belum ada pesanan servis yang masuk.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => {
                    const statusInfo = getOrderStatusLabel(order.status);
                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        {/* min-w-0 + truncate: nama/email panjang tidak pernah
                            bertabrakan atau meluber keluar kartu. */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap">
                              {order.ticketNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusInfo.bg}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {order.deviceType} • {order.deviceBrand}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                            Pemilik:{' '}
                            <span className="text-slate-700 dark:text-slate-200 font-medium">
                              {order.customer?.name}
                            </span>
                            <span className="text-slate-500 dark:text-slate-500">
                              {' '}• {order.customer?.email}
                            </span>
                          </p>
                        </div>

                        <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 sm:pl-4 border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Biaya:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm whitespace-nowrap">
                            {formatCurrency(order.estimatedPrice || order.finalPrice)}
                          </span>
                          <span className="text-[10px] text-slate-500 block whitespace-nowrap">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Cols: Customer Terbaru */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  Customer Terbaru
                </CardTitle>
                <CardDescription>Pelanggan yang baru saja mendaftar di sistem</CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              {recentCustomers.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-700 dark:text-slate-500" />
                  <p className="text-xs">Belum ada pelanggan terdaftar.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center font-bold text-white shrink-0">
                          {cust.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{cust.name}</p>
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" /> {cust.email}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 block mb-0.5 whitespace-nowrap">
                          {cust._count.orders} Pesanan
                        </span>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {formatDate(cust.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
