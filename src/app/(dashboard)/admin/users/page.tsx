import React from 'react';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminUsersManager, type UserRow } from '@/components/admin/AdminUsersManager';
import { UserCog } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 8;

/**
 * Manajemen User (Admin): daftar akun + pencarian + filter role/status +
 * pagination. Query server-side (Prisma read-only); mutasi lewat API
 * /api/admin/users (Admin only, password selalu di-hash, tidak pernah
 * ditampilkan). Halaman "Data Pelanggan" (/admin/customers) TETAP ADA dan
 * tidak disentuh — modul ini khusus akun & otorisasi.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }>;
}) {
  const session = await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const q = (resolvedSearchParams.q || '').trim().slice(0, 120);
  const roleFilter =
    resolvedSearchParams.role === 'ADMIN'
      ? ('ADMIN' as const)
      : resolvedSearchParams.role === 'CUSTOMER'
        ? ('CUSTOMER' as const)
        : ('ALL' as const);
  const statusFilter =
    resolvedSearchParams.status === 'ACTIVE'
      ? ('ACTIVE' as const)
      : resolvedSearchParams.status === 'INACTIVE'
        ? ('INACTIVE' as const)
        : ('ALL' as const);
  const page = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);

  let users: UserRow[] = [];
  let total = 0;
  let totalPages = 1;
  let activeAdmins = 0;

  try {
    const where = {
      ...(roleFilter !== 'ALL' ? { role: roleFilter } : {}),
      ...(statusFilter !== 'ALL' ? { isActive: statusFilter === 'ACTIVE' } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [cnt, rows, admins] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        // Kolom password TIDAK PERNAH dipilih — tidak pernah sampai ke UI.
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),
    ]);

    total = cnt;
    totalPages = Math.max(1, Math.ceil(cnt / PAGE_SIZE));
    activeAdmins = admins;
    users = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error loading admin users:', error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Manajemen User
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola akun Admin & Customer: identitas, role, dan status aktif akun. Kata sandi
              selalu di-hash (bcrypt) dan tidak pernah ditampilkan.
            </p>
          </div>
        </div>
      </div>

      <AdminUsersManager
        initialUsers={users}
        total={total}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        activeAdmins={activeAdmins}
        currentAdminId={session.id}
        filters={{ q, role: roleFilter, status: statusFilter }}
      />
    </div>
  );
}
