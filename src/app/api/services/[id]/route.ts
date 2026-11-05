import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serviceSchema } from '@/lib/validations/service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: Ambil detail satu layanan
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const showInactive = searchParams.get('all') === 'true';

    const session = await getSession();
    const isAdmin = session?.role === 'ADMIN';

    // Publik hanya boleh melihat layanan AKTIF.
    // Admin dengan ?all=true boleh melihat layanan nonaktif.
    const where = { id: params.id };
    if (!isAdmin || !showInactive) {
      Object.assign(where, { isActive: true });
    }

    const service = await prisma.service.findUnique({ where });

    if (!service) {
      return NextResponse.json({ error: 'Layanan tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT / PATCH: Update layanan (Khusus Admin)
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const body = await request.json();

    // Jika hanya toggle status aktif / nonaktif
    if (Object.keys(body).length === 1 && body.isActive !== undefined) {
      const updated = await prisma.service.update({
        where: { id: params.id },
        data: { isActive: Boolean(body.isActive) },
      });
      return NextResponse.json({
        message: `Layanan berhasil di-${updated.isActive ? 'aktifkan' : 'nonaktifkan'}!`,
        service: updated,
      });
    }

    // Full form update validation
    const parsed = serviceSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Validasi formulir gagal.';
      return NextResponse.json({ error: firstError, details: parsed.error.format() }, { status: 400 });
    }

    const { name, description, price, estimatedDuration, image, isActive } = parsed.data;

    const updatedService = await prisma.service.update({
      where: { id: params.id },
      data: {
        name,
        description,
        price,
        estimatedDuration,
        image: image && image.trim() !== '' ? image : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({
      message: 'Data layanan berhasil diperbarui!',
      service: updatedService,
    });
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui layanan.' }, { status: 500 });
  }
}

// DELETE: Hapus layanan (Khusus Admin)
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    // Cek apakah layanan ini terhubung dengan pesanan yang sudah ada
    const relatedOrdersCount = await prisma.serviceOrder.count({
      where: { serviceId: params.id },
    });

    if (relatedOrdersCount > 0) {
      // Jika ada pesanan terkait, nonaktifkan (soft delete) agar integritas foreign key terjaga
      await prisma.service.update({
        where: { id: params.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: `Layanan memiliki ${relatedOrdersCount} pesanan terkait, status telah diubah menjadi NONAKTIF secara aman.`,
      });
    }

    // Jika tidak ada pesanan terkait, hapus permanen
    await prisma.service.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Layanan berhasil dihapus secara permanen!',
    });
  } catch (error: any) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus layanan.' }, { status: 500 });
  }
}
