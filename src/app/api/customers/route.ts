import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';
    const statusFilter = searchParams.get('status') || 'ALL';
    const sortBy = searchParams.get('sortBy') || 'NEWEST';

    // Ambil seluruh customer beserta orders
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
            orders: true,
            conversations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalRevenue = 0;
    let activeCustomerCount = 0;

    const formattedCustomers = rawCustomers.map((c) => {
      const orders = c.orders || [];
      const totalOrders = orders.length;

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

      if (activeOrders > 0) {
        activeCustomerCount++;
      }

      totalRevenue += spent;

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.createdAt.toISOString(),
        totalOrders,
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

    // Filtering
    let filtered = formattedCustomers.filter((c) => {
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q) || false;
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      if (statusFilter === 'ACTIVE' && c.activeOrders === 0) return false;
      if (statusFilter === 'HAS_ORDERS' && c.totalOrders === 0) return false;
      if (statusFilter === 'NO_ORDERS' && c.totalOrders > 0) return false;

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'ORDERS_COUNT') return b.totalOrders - a.totalOrders;
      if (sortBy === 'TOTAL_SPENT') return b.totalSpent - a.totalSpent;
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Default NEWEST
    });

    return NextResponse.json({
      customers: filtered,
      metrics: {
        totalCustomers: formattedCustomers.length,
        activeCustomers: activeCustomerCount,
        totalRevenue,
        avgSpendPerCustomer:
          formattedCustomers.length > 0 ? Math.round(totalRevenue / formattedCustomers.length) : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data pelanggan.' }, { status: 500 });
  }
}
