import React from 'react';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminServicesManager } from '@/components/admin/AdminServicesManager';

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  await requireAdmin();

  let services: any[] = [];
  try {
    services = await prisma.service.findMany({
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    console.error('Error loading admin services:', error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Katalog & Manajemen Layanan IT</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Kelola daftar layanan perbaikan komputer & IT, tarif biaya, estimasi durasi, dan status publikasi.
        </p>
      </div>

      <AdminServicesManager initialServices={services} />
    </div>
  );
}
