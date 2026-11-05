import React from 'react';
import { ClipboardList, PlusCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminOrdersTable } from '@/components/admin/AdminOrdersTable';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
  await requireAdmin();

  let orders: any[] = [];
  try {
    orders = await prisma.serviceOrder.findMany({
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
        service: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching admin orders list:', error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Manajemen Antrian Tiket Servis</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Pusat monitoring seluruh pesanan masuk, pembaruan status pengerjaan, dan pencatatan biaya servis
        </p>
      </div>

      {/* Interactive Table Component */}
      <AdminOrdersTable initialOrders={orders} />
    </div>
  );
}
