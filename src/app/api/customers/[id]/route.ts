import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET: Detail lengkap pelanggan beserta seluruh riwayat pesanan servis
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const customer = await prisma.user.findUnique({
      where: { id: params.id, role: 'CUSTOMER' },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            service: true,
            statusHistory: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan.' }, { status: 404 });
    }

    let totalSpent = 0;
    let completedOrders = 0;
    let activeOrders = 0;

    const orders = customer.orders.map((o) => {
      const price = Number(o.finalPrice || o.estimatedPrice || 0);
      const isDone = o.status === 'COMPLETED' || o.status === 'DELIVERED';
      if (isDone) {
        completedOrders++;
        totalSpent += price;
      } else {
        activeOrders++;
      }

      return {
        id: o.id,
        ticketNumber: o.ticketNumber,
        deviceType: o.deviceType,
        deviceBrand: o.deviceBrand,
        problemDescription: o.problemDescription,
        serviceMethod: o.serviceMethod,
        address: o.address,
        serviceName: o.service?.name || 'Servis Kustom / Manual',
        estimatedPrice: Number(o.estimatedPrice || 0),
        finalPrice: Number(o.finalPrice || 0),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        statusHistory: o.statusHistory.map((h) => ({
          id: h.id,
          status: h.status,
          note: h.note,
          createdAt: h.createdAt.toISOString(),
        })),
      };
    });

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        createdAt: customer.createdAt.toISOString(),
        stats: {
          totalOrders: orders.length,
          activeOrders,
          completedOrders,
          totalSpent,
        },
        orders,
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer detail:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat detail pelanggan.' }, { status: 500 });
  }
}

// PATCH: Perbarui data profil pelanggan atau reset kata sandi
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, password } = body;

    const currentCustomer = await prisma.user.findUnique({
      where: { id: params.id, role: 'CUSTOMER' },
    });

    if (!currentCustomer) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan.' }, { status: 404 });
    }

    // Cek duplikasi email jika diubah
    if (email && email.toLowerCase() !== currentCustomer.email.toLowerCase()) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingEmail && existingEmail.id !== params.id) {
        return NextResponse.json({ error: 'Alamat email telah terdaftar oleh pengguna lain.' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (password && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Data pelanggan berhasil diperbarui!',
      customer: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui data pelanggan.' }, { status: 500 });
  }
}

// DELETE: Hapus akun pelanggan
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const customer = await prisma.user.findUnique({
      where: { id: params.id, role: 'CUSTOMER' },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Pelanggan tidak ditemukan.' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: `Akun pelanggan "${customer.name}" (${customer.email}) berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus data pelanggan.' }, { status: 500 });
  }
}
