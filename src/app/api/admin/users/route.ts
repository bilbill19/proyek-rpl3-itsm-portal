/**
 * ============================================================================
 * /api/admin/users  ->  Manajemen User (khusus ADMIN)
 * ============================================================================
 *
 * GET  /api/admin/users?q=&role=&status=&page=
 *   - Daftar akun (NAMA, EMAIL, ROLE, STATUS AKUN, DIBUAT) + pagination.
 *   - Filter: pencarian q (nama/email), role (ADMIN|CUSTOMER|ALL),
 *     status (ACTIVE|INACTIVE|ALL).
 *   - Kolom `password` TIDAK PERNAH dipilih/dikirim (select eksplisit).
 *
 * POST /api/admin/users
 *   - Buat akun baru: email unik (case-insensitive), password di-hash bcrypt
 *     lewat mekanisme autentikasi proyek (lib/auth.hashPassword).
 *
 * AKSES: hanya role ADMIN (401 tanpa sesi, 403 untuk non-Admin).
 * Runtime: Node.js (Prisma/PostgreSQL).
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { createUserSchema } from '@/lib/validations/user';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (bukan Edge) — wajib untuk Prisma/PostgreSQL.
export const runtime = 'nodejs';

/** Select eksplisit: kolom password TIDAK PERNAH masuk respons. */
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(['ADMIN', 'CUSTOMER', 'ALL']).optional().default('ALL'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).optional().default('ALL'),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya Admin yang dapat mengelola data akun.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      q: url.searchParams.get('q') ?? undefined,
      role: url.searchParams.get('role') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      page: url.searchParams.get('page') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parameter filter tidak valid.', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { q, role, status, page } = parsed.data;
    const PAGE_SIZE = 8;

    const where = {
      ...(role !== 'ALL' ? { role } : {}),
      ...(status !== 'ALL' ? { isActive: status === 'ACTIVE' } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, users, activeAdmins] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      // Untuk guard "minimal satu Admin aktif" di sisi UI
      prisma.user.count({ where: { role: 'ADMIN', isActive: true } }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      activeAdmins,
    });
  } catch (error) {
    console.error('Admin Users GET Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengambil data akun.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya Admin yang dapat membuat akun.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data akun tidak valid.', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role, phone } = parsed.data;

    // Email unik (sudah dinormalisasi huruf kecil oleh skema)
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar — gunakan email lain.' },
        { status: 409 }
      );
    }

    // Password di-hash dengan mekanisme autentikasi proyek (bcrypt).
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, password: passwordHash, role, phone: phone ?? null },
      select: USER_SELECT,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Admin Users POST Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat akun.' },
      { status: 500 }
    );
  }
}
