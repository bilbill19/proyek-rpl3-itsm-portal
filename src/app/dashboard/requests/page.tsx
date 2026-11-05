import React from 'react';
import Link from 'next/link';
import { Laptop, PlusCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';
import { requireCustomer } from '@/lib/rbac';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CustomerRequestsPage() {
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
    console.error('Error fetching customer requests:', error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Riwayat & Status Tiket Servis</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Pantau rincian setiap tiket perbaikan perangkat yang pernah Anda ajukan.
          </p>
        </div>

        <Link href="/dashboard/requests/new">
          <Button size="sm">
            <PlusCircle className="w-4 h-4" />
            <span>Ajukan Servis Baru</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <Card className="text-center py-16 space-y-3">
            <Laptop className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Belum Ada Riwayat Tiket</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Anda belum memiliki tiket perbaikan. Ajukan perbaikan laptop atau komputer Anda sekarang.
            </p>
            <Link href="/dashboard/requests/new" className="inline-block pt-2">
              <Button size="md">
                <PlusCircle className="w-4 h-4" />
                <span>Buat Tiket Servis</span>
              </Button>
            </Link>
          </Card>
        ) : (
          orders.map((order) => {
            const statusInfo = getOrderStatusLabel(order.status);
            return (
              <Card key={order.id} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                      {order.ticketNumber}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Diajukan: {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.bg}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Perangkat:</span>
                    <p className="text-slate-900 dark:text-white font-semibold">{order.deviceType} • {order.deviceBrand}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Layanan Terpilih:</span>
                    <p className="text-slate-600 dark:text-slate-300">{order.service?.name || 'Diagnosa Kerusakan Umum'}</p>
                  </div>
                  <div className="md:text-right">
                    <span className="text-slate-500 block text-[11px]">Estimasi Biaya:</span>
                    <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                      {formatCurrency(order.estimatedPrice || order.finalPrice)}
                    </p>
                  </div>
                </div>

                {order.problemDescription && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 block text-[11px] mb-0.5">Keluhan Kerusakan:</span>
                    {order.problemDescription}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
