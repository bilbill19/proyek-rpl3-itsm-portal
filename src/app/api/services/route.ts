import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { serviceSchema } from '@/lib/validations/service';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar layanan (Default: hanya aktif, Admin: bisa minta semua dengan ?all=true)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const getAll = searchParams.get('all') === 'true';

    const session = await getSession();
    const where = getAll && session?.role === 'ADMIN' ? {} : { isActive: true };

    const services = await prisma.service.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Tambah layanan baru (Khusus Admin)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = serviceSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Validasi formulir gagal.';
      return NextResponse.json({ error: firstError, details: parsed.error.format() }, { status: 400 });
    }

    const { name, description, price, estimatedDuration, image, isActive } = parsed.data;

    const newService = await prisma.service.create({
      data: {
        name,
        description,
        price,
        estimatedDuration,
        image: image && image.trim() !== '' ? image : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ message: 'Layanan baru berhasil ditambahkan!', service: newService }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan layanan.' }, { status: 500 });
  }
}
