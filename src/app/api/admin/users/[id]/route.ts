/**
 * PATCH /api/admin/users/[id]  ->  Edit akun (khusus ADMIN)
 *
 * Perubahan yang didukung: nama pribadi, email, role, status aktif, phone,
 * dan (opsional) kata sandi baru (langsung di-hash bcrypt).
 *
 * GUARD KEAMANAN:
 *   1. Admin TIDAK bisa menonaktifkan akunnya sendiri.
 *   2. Admin TIDAK bisa menghapus admin aktif TERAKHIR (role turun dari ADMIN
 *      atau dinonaktifkan saat tidak ada admin aktif lain) → sistem tidak
 *      pernah kehilangan seluruh Admin.
 *   3. Email tetap unik (case-insensitive), kecuali milik akun itu sendiri.
 *   4. Kolom password TIDAK PERNAH dikirim balik (select eksplisit).
 *
 * AKSES: hanya role ADMIN. Runtime: Node.js (Prisma/PostgreSQL).
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { updateUserSchema } from '@/lib/validations/user';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (bukan Edge) — wajib untuk Prisma/PostgreSQL.
export const runtime = 'nodejs';

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

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Hanya Admin yang dapat mengubah akun.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data perubahan tidak valid.', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = parsed.data;

    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, isActive: true, email: true },
    });
    if (!target) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    const isSelf = target.id === session.id;
    const wantsDeactivate = data.isActive === false;
    const wantsDemote = data.role !== undefined && data.role !== 'ADMIN' && target.role === 'ADMIN';

    // GUARD 1: jangan izinkan Admin menonaktifkan akunnya sendiri
    if (isSelf && wantsDeactivate) {
      return NextResponse.json(
        { error: 'Anda tidak dapat menonaktifkan akun Anda sendiri.' },
        { status: 400 }
      );
    }

    // GUARD 2: jangan kehilangan Admin aktif terakhir
    if (wantsDeactivate || wantsDemote) {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: 'ADMIN', isActive: true, id: { not: target.id } },
      });
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          {
            error:
              'Tidak dapat mengubah akun: sistem harus memiliki setidaknya satu Admin aktif.',
          },
          { status: 400 }
        );
      }
    }

    // Email unik bila diganti (kecuali tetap milik sendiri)
    let emailUpdate: { email?: string } = {};
    if (data.email !== undefined && data.email !== target.email) {
      const clash = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      if (clash && clash.id !== target.id) {
        return NextResponse.json(
          { error: 'Email sudah dipakai akun lain.' },
          { status: 409 }
        );
      }
      emailUpdate = { email: data.email };
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...emailUpdate,
        ...(data.role !== undefined ? { role: data.role } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
        ...(data.password !== undefined ? { password: await hashPassword(data.password) } : {}),
      },
      select: USER_SELECT,
    });

    // Catatan: sesi JWT lama tidak perlu diperbarui — getSession() membaca
    // data TERBARU dari database setiap request (nama/role/aktif langsung berlaku).
    return NextResponse.json({ user: updated, selfUpdated: isSelf });
  } catch (error) {
    console.error('Admin Users PATCH Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat mengubah akun.' },
      { status: 500 }
    );
  }
}
