import React from 'react';
import Link from 'next/link';
import {
  Search,
  Laptop,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  Car,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { requireCustomer } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CustomerTrackingPage() {
  const session = await requireCustomer();

  // Ambil hanya pesanan milik customer yang sedang login
  const orders = await prisma.serviceOrder.findMany({
    where: { customerId: session.id },
    include: {
      service: true,
      statusHistory: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const activeOrders = orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'DELIVERED');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tracking Live Service IT</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Pantau status pengerjaan teknisi secara real-time untuk seluruh tiket perbaikan aktif Anda
          </p>
        </div>

        <Link href="/dashboard/orders/new">
          <Button size="md" className="shadow-lg shadow-indigo-600/30 whitespace-nowrap">
            <Wrench className="w-4 h-4" />
            <span>Pesan Service Baru</span>
          </Button>
        </Link>
      </div>

      {/* Active Orders Tracker */}
      <div className="space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Tiket Aktif Dalam Proses ({activeOrders.length})
        </h2>

        {activeOrders.length === 0 ? (
          <Card className="border-slate-200 dark:border-slate-800 text-center py-12">
            <CardContent className="space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-400 mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tidak Ada Service yang Sedang Berjalan</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Semua perangkat Anda telah selesai diservis atau Anda belum memiliki tiket perbaikan yang aktif.
              </p>
              <div className="pt-2">
                <Link href="/dashboard/orders/new">
                  <Button size="sm">
                    <span>Ajukan Service Baru</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeOrders.map((order) => {
              const statusInfo = getOrderStatusLabel(order.status);
              return (
                <Card key={order.id} className="border-slate-200 dark:border-slate-800 overflow-hidden">
                  <CardContent className="p-6 space-y-6">
                    {/* Top Info Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                            {order.ticketNumber}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.bg}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                          {order.deviceType} • {order.deviceBrand}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Estimasi Tarif:</span>
                          <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(order.estimatedPrice || order.finalPrice)}
                          </span>
                        </div>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button size="sm" variant="secondary" className="text-xs">
                            <span>Detail Tiket</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Progress Stepper Stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      {[
                        { title: '1. Dibuat', desc: 'Tiket terdaftar', done: true },
                        {
                          title: '2. Diterima',
                          desc: order.serviceMethod === 'ONSITE' ? 'Kunjungan teknisi' : 'Workshop',
                          done: ['DEVICE_RECEIVED', 'CHECKING', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED', 'DELIVERED'].includes(order.status),
                        },
                        {
                          title: '3. Diagnosa & Pengerjaan',
                          desc: 'Perbaikan komponen',
                          done: ['CHECKING', 'IN_PROGRESS', 'WAITING_APPROVAL', 'COMPLETED', 'DELIVERED'].includes(order.status),
                        },
                        {
                          title: '4. Selesai & QC',
                          desc: 'Pengujian & garansi',
                          done: ['COMPLETED', 'DELIVERED'].includes(order.status),
                        },
                      ].map((step, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border ${
                            step.done
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500/40 text-slate-900 dark:text-white'
                              : 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                step.done ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span className="font-semibold leading-tight">{step.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 pl-7">{step.desc}</p>
                        </div>
                      ))}
                    </div>

                    {/* Latest Note */}
                    {order.statusHistory[0]?.note && (
                      <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 block text-[11px] mb-1">
                          Catatan Teknisi Terbaru ({formatDate(order.statusHistory[0].createdAt)}):
                        </span>
                        <p>{order.statusHistory[0].note}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
