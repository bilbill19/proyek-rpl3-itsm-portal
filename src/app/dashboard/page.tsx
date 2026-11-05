import React from 'react';
import Link from 'next/link';
import {
  Laptop,
  PlusCircle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Search,
  Bot,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import { requireCustomer } from '@/lib/rbac';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CustomerDashboardPage() {
  // Autentikasi dan pastikan hanya Customer yang sedang login
  const session = await requireCustomer();

  let orders: any[] = [];
  let activeOrderCount = 0;
  let completedOrderCount = 0;

  try {
    // Ambil HANYA pesanan milik customer yang sedang login
    orders = await prisma.serviceOrder.findMany({
      where: { customerId: session.id },
      include: {
        service: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter service yang sedang diproses vs service selesai
    activeOrderCount = orders.filter(
      (o) => o.status !== 'COMPLETED' && o.status !== 'DELIVERED'
    ).length;
    completedOrderCount = orders.filter(
      (o) => o.status === 'COMPLETED' || o.status === 'DELIVERED'
    ).length;
  } catch (error) {
    console.error('Error fetching customer orders:', error);
  }

  // Ambil 5 pesanan terbaru
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 1. Welcome Message & Quick Actions Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-indigo-950/80 dark:via-slate-900 dark:to-purple-950/70 border border-indigo-500/30 p-6 sm:p-8 relative overflow-hidden shadow-lg dark:shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Portal Layanan & Garansi Terpadu</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Selamat Datang, <span className="gradient-text">{session.name}</span>! 👋
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Kelola dan pantau seluruh tahapan perbaikan perangkat komputer, laptop, dan kebutuhan IT Anda secara transparan dengan jaminan garansi servis resmi.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Link href="/dashboard/orders/new">
              <Button size="md" className="shadow-lg shadow-indigo-600/30">
                <PlusCircle className="w-4 h-4" />
                <span>Pesan Service Baru</span>
              </Button>
            </Link>

            <Link href="/dashboard/tracking">
              <Button size="md" variant="secondary" className="border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100">
                <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Tracking Tiket</span>
              </Button>
            </Link>

            <Link href="/dashboard/ai">
              <Button size="md" variant="secondary" className="border-purple-300 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-200">
                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Konsultasi AI</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2, 3, 4. Summary KPI Cards: Total Pesanan, Sedang Diproses, Selesai */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Pesanan */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Pesanan</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{orders.length}</p>
            <p className="text-[11px] text-slate-500">Semua riwayat pengajuan tiket</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Layers className="w-7 h-7" />
          </div>
        </div>

        {/* Service Sedang Diproses */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-amber-500/30 transition-all shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400/90">Service Sedang Diproses</p>
            <p className="text-3xl font-black text-amber-700 dark:text-amber-400">{activeOrderCount}</p>
            <p className="text-[11px] text-slate-500">Diagnosa & pengerjaan teknisi</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
            <Clock className="w-7 h-7" />
          </div>
        </div>

        {/* Service Selesai */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-emerald-500/30 transition-all shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400/90">Service Selesai</p>
            <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{completedOrderCount}</p>
            <p className="text-[11px] text-slate-500">Siap diambil atau sudah dikirim</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* 5. Pesanan Terbaru */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Pesanan Terbaru
            </CardTitle>
            <CardDescription>
              Daftar tiket service yang baru saja Anda buat beserta status perkembangan terbarunya
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard/history">
              <Button size="sm" variant="secondary" className="text-xs whitespace-nowrap">
                <span>Lihat Semua ({orders.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/dashboard/orders/new">
              <Button size="sm" className="whitespace-nowrap">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Pesan Baru</span>
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
                <Laptop className="w-8 h-8" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Pesanan Service</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Anda belum pernah membuat pesanan perbaikan komputer atau laptop. Klik tombol di bawah untuk membuat pesanan pertama Anda.
                </p>
              </div>
              <Link href="/dashboard/orders/new" className="inline-block pt-2">
                <Button size="md">
                  <PlusCircle className="w-4 h-4" />
                  <span>Pesan Service Sekarang</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const statusInfo = getOrderStatusLabel(order.status);
                return (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 transition-all duration-200 space-y-3 group shadow-sm"
                  >
                    {/* Top Row: Ticket Number, Date, and Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                          {order.ticketNumber}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {formatDate(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button size="sm" variant="ghost" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-white">
                            Lihat Detail →
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Middle Row: Device, Service, and Estimated/Final Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Perangkat:</span>
                        <p className="text-slate-900 dark:text-white font-semibold flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          {order.deviceType} • {order.deviceBrand}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px]">Jenis Layanan & Metode:</span>
                        <p className="text-slate-600 dark:text-slate-300">
                          {order.service?.name || 'Diagnosa & Perbaikan Umum'}
                          <span className="text-slate-500 block text-[10px]">
                            {order.serviceMethod === 'ONSITE' ? '🚗 Teknisi ke Lokasi' : '🏢 Antar ke Workshop'}
                          </span>
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-slate-500 block text-[11px]">Estimasi Biaya:</span>
                        <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                          {formatCurrency(order.estimatedPrice || order.finalPrice)}
                        </p>
                      </div>
                    </div>

                    {/* Problem Snippet */}
                    {order.problemDescription && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-4">
                        <div className="truncate">
                          <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px] mr-2">Keluhan:</span>
                          <span className="text-slate-600 dark:text-slate-300">{order.problemDescription}</span>
                        </div>
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Detail Pesanan
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
