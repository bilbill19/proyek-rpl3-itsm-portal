import React from 'react';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminOrderDetailManager } from '@/components/admin/AdminOrderDetailManager';

export const dynamic = 'force-dynamic';

interface AdminOrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  // Pastikan hanya ADMIN yang dapat mengakses halaman detail & kontrol order ini
  await requireAdmin();

  const order = await prisma.serviceOrder.findUnique({
    where: { id: params.id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      },
      service: true,
      statusHistory: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return <AdminOrderDetailManager initialOrder={order} />;
}
