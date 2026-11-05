import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { createServiceOrderSchema } from '@/lib/validations/order';
import { retryTicketCreate } from '@/lib/order-ticket';

// GET: Ambil daftar tiket / order (Admin dapat melihat semua, Customer hanya miliknya)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const where = session.role === 'ADMIN' ? {} : { customerId: session.id };

    const orders = await prisma.serviceOrder.findMany({
      where,
      include: {
        customer: {
          select: { name: true, email: true, phone: true },
        },
        service: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}

// POST: Buat pesanan service baru (Customer)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login untuk membuat pesanan servis.' }, { status: 401 });
    }

    if (session.role !== 'CUSTOMER') return NextResponse.json({ error: 'Hanya pelanggan dapat membuat pesanan.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    const parsed = createServiceOrderSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Validasi formulir pesanan gagal.';
      return NextResponse.json(
        { error: firstError, details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      serviceId,
      deviceType,
      deviceBrand,
      problemDescription,
      damageImage,
      serviceMethod,
      address,
    } = parsed.data;

    // 1. Generate nomor tiket otomatis: Format "SRV-YYYY-XXXX" (cth: SRV-2026-0001)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear + 1, 0, 1);

    const totalOrdersThisYear = await prisma.serviceOrder.count({
      where: {
        createdAt: {
          gte: startOfYear,
          lt: endOfYear,
        },
      },
    });

    let nextNumber = totalOrdersThisYear + 1;
    let ticketNumber = `SRV-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    // Pastikan nomor tiket unik jika terjadi konkurensi
    let existingTicket = await prisma.serviceOrder.findUnique({
      where: { ticketNumber },
    });

    while (existingTicket) {
      nextNumber += 1;
      ticketNumber = `SRV-${currentYear}-${String(nextNumber).padStart(4, '0')}`;
      existingTicket = await prisma.serviceOrder.findUnique({
        where: { ticketNumber },
      });
    }

    // 2. Ambil estimasi harga jika ada layanan yang dipilih
    let estimatedPrice = null;
    if (serviceId && serviceId.trim() !== '') {
      const selectedService = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (!selectedService || !selectedService.isActive) return NextResponse.json({ error: 'Layanan tidak tersedia.' }, { status: 400 });
      estimatedPrice = selectedService.price;
    }

    // 3. Simpan ServiceOrder dengan status awal CREATED dan ServiceOrderStatusHistory awal
    const newOrder = await retryTicketCreate(ticketNumber, nextNumber, currentYear, (candidate) => prisma.serviceOrder.create({
      data: {
        ticketNumber: candidate,
        customerId: session.id,
        serviceId: serviceId && serviceId.trim() !== '' ? serviceId : null,
        deviceType,
        deviceBrand,
        problemDescription,
        damageImage: damageImage && damageImage.trim() !== '' ? damageImage : null,
        serviceMethod,
        address: address && address.trim() !== '' ? address : null,
        estimatedPrice,
        status: 'CREATED',
        statusHistory: {
          create: {
            status: 'CREATED',
            note:
              serviceMethod === 'ONSITE'
                ? 'Pesanan servis dibuat oleh pelanggan (Metode: Teknisi Datang ke Lokasi). Menunggu jadwal penugasan teknisi.'
                : 'Pesanan servis dibuat oleh pelanggan (Metode: Antar Perangkat ke Workshop). Menunggu perangkat diserahkan ke workshop.',
          },
        },
      },
      include: {
        service: true,
        statusHistory: true,
      },
    }));

    return NextResponse.json(
      {
        message: 'Pesanan service berhasil dibuat!',
        order: newOrder,
        redirectUrl: `/dashboard/orders/${newOrder.id}`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Service Order Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat membuat pesanan servis.' },
      { status: 500 }
    );
  }
}
