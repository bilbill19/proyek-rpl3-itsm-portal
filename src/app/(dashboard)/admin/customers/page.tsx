import React from 'react';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminCustomersManager } from '@/components/admin/AdminCustomersManager';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  await requireAdmin();

  let customers: any[] = [];
  try {
    const rawCustomers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
      },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ticketNumber: true,
            deviceType: true,
            deviceBrand: true,
            status: true,
            estimatedPrice: true,
            finalPrice: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    customers = rawCustomers.map((c) => {
      const orders = c.orders || [];
      let spent = 0;
      let activeOrders = 0;
      let completedOrders = 0;

      orders.forEach((o) => {
        const isDone = o.status === 'COMPLETED' || o.status === 'DELIVERED';
        if (isDone) {
          completedOrders++;
          spent += Number(o.finalPrice || o.estimatedPrice || 0);
        } else {
          activeOrders++;
        }
      });

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt.toISOString(),
        totalOrders: orders.length,
        activeOrders,
        completedOrders,
        totalSpent: spent,
        lastOrderDate: orders[0]?.createdAt.toISOString() || null,
        conversationsCount: c._count.conversations,
        recentOrders: orders.slice(0, 5).map((o) => ({
          id: o.id,
          ticketNumber: o.ticketNumber,
          deviceType: o.deviceType,
          deviceBrand: o.deviceBrand,
          status: o.status,
          price: Number(o.finalPrice || o.estimatedPrice || 0),
          createdAt: o.createdAt.toISOString(),
        })),
      };
    });
  } catch (error) {
    console.error('Error loading admin customers:', error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Data & Manajemen Pelanggan</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola database klien, pantau riwayat tiket servis, kontak WhatsApp, dan akumulasi pengeluaran.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Customers Manager Component */}
      <AdminCustomersManager initialCustomers={customers} />
    </div>
  );
}
