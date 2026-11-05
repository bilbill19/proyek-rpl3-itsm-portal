import React from 'react';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminReportsManager } from '@/components/admin/AdminReportsManager';

export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  await requireAdmin();

  let orders: any[] = [];
  let inventory: any[] = [];
  let services: any[] = [];
  let customers: any[] = [];

  try {
    const [rawOrders, rawInventory, rawServices, rawCustomers] = await Promise.all([
      // 1. All service orders with customer and service details
      prisma.serviceOrder.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),

      // 2. Inventory spareparts for asset valuation
      (prisma as any).inventoryItem.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),

      // 3. Active service catalog
      prisma.service.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { orders: true },
          },
        },
      }),

      // 4. Customer spending records
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        include: {
          orders: {
            select: {
              id: true,
              status: true,
              estimatedPrice: true,
              finalPrice: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);

    // Serialize Orders
    orders = rawOrders.map((o) => ({
      ...o,
      estimatedPrice: Number(o.estimatedPrice) || 0,
      finalPrice: Number(o.finalPrice) || 0,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      service: o.service
        ? {
            ...o.service,
            price: Number(o.service.price) || 0,
          }
        : null,
      statusHistory: (o.statusHistory || []).map((h) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      })),
    }));

    // Serialize Inventory
    inventory = rawInventory.map((item: any) => ({
      ...item,
      purchasePrice: Number(item.purchasePrice) || 0,
      sellingPrice: Number(item.sellingPrice) || 0,
      createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: item.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    // Serialize Services
    services = rawServices.map((s) => ({
      ...s,
      price: Number(s.price) || 0,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    // Serialize Customers
    customers = rawCustomers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      createdAt: c.createdAt.toISOString(),
      orders: c.orders.map((co) => ({
        id: co.id,
        status: co.status,
        estimatedPrice: Number(co.estimatedPrice) || 0,
        finalPrice: Number(co.finalPrice) || 0,
        createdAt: co.createdAt.toISOString(),
      })),
    }));
  } catch (error) {
    console.error('Error fetching admin reports data:', error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminReportsManager
        orders={orders}
        inventory={inventory}
        services={services}
        customers={customers}
      />
    </div>
  );
}
