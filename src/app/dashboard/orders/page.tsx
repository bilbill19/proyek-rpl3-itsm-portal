import React from 'react';
import Link from 'next/link';
import {
  Laptop,
  PlusCircle,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import { requireCustomer } from '@/lib/rbac';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CustomerOrdersListPage() {
  const session = await requireCustomer();

  let orders: any[] = [];
  try {
    orders = await prisma.serviceOrder.findMany({
      where: { customerId: session.id },
      include: {
        service: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Daftar Pesanan Service</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Riwayat lengkap dan status pengerjaan tiket service IT perangkat Anda
          </p>
        </div>

        <Link href="/dashboard/orders/new">
          <Button size="md" className="shadow-lg shadow-indigo-600/30">
            <PlusCircle className="w-4 h-4" />
            <span>Buat Pesanan Service Baru</span>
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Semua Tiket Servis ({orders.length})</CardTitle>
          <CardDescription>
            Pilih tiket untuk melihat detail diagnosa, rincian biaya, dan riwayat status teknisi
          </CardDescription>
        </CardHeader>

        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
                <Laptop className="w-8 h-8" />
              </div>
              <div className="max-w-sm mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Pesanan Service</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Anda belum pernah membuat pesanan perbaikan perangkat.
                </p>
              </div>
              <Link href="/dashboard/orders/new" className="inline-block pt-2">
                <Button size="md">
                  <PlusCircle className="w-4 h-4" />
                  <span>Buat Pesanan Pertama</span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusInfo = getOrderStatusLabel(order.status);
                return (
                  <div
                    key={order.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3 group"
                  >
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
                          <Button size="sm" variant="secondary" className="text-xs">
                            <span>Detail</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Perangkat:</span>
                        <p className="text-slate-900 dark:text-white font-semibold">{order.deviceType} • {order.deviceBrand}</p>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[11px]">Layanan & Metode:</span>
                        <p className="text-slate-600 dark:text-slate-300">
                          {order.service?.name || 'Pemeriksaan Umum'} •{' '}
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {order.serviceMethod === 'ONSITE' ? 'Teknisi ke Lokasi' : 'Antar ke Workshop'}
                          </span>
                        </p>
                      </div>

                      <div className="md:text-right">
                        <span className="text-slate-500 block text-[11px]">Estimasi Biaya:</span>
                        <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                          {formatCurrency(order.estimatedPrice || order.finalPrice)}
                        </p>
                      </div>
                    </div>

                    {order.problemDescription && (
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-600 dark:text-slate-400 text-[11px] block mb-0.5">Keluhan Kerusakan:</span>
                        <p className="line-clamp-2">{order.problemDescription}</p>
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
