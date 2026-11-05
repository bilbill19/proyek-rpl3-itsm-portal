import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkRateLimit, TRACK_RATE_LIMIT, TRACK_RATE_WINDOW_MS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Rate limit per IP untuk mencegah enumerasi tiket berurutan
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(`track:${ip}`, TRACK_RATE_LIMIT, TRACK_RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan tracking. Silakan tunggu sebentar.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ticket = searchParams.get('ticket')?.trim().toUpperCase();

    if (!ticket) {
      return NextResponse.json(
        { error: 'Nomor tiket wajib diisi. Contoh: SRV-2026-0001' },
        { status: 400 }
      );
    }

    // Cari pesanan berdasarkan ticketNumber (case-insensitive)
    const order = await prisma.serviceOrder.findFirst({
      where: {
        ticketNumber: {
          equals: ticket,
          mode: 'insensitive',
        },
      },
      include: {
        service: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      // Respons sama untuk tiket tidak ditemukan & tidak ada akses
      // (hindari enumerasi: jangan bedakan 404 vs 403 vs 400)
      return NextResponse.json(
        { error: `Tiket "${ticket}" tidak ditemukan atau tidak dapat diakses.` },
        { status: 404 }
      );
    }

    // TRACKING PUBLIK: hanya informasi status non-PII.
    // Data sensitif (problemDescription, damageImage, address, serviceMethod)
    // HANYA tersedia untuk pemilik akun via login (/dashboard/orders atau AI Smart).
    const publicOrder = {
      ticketNumber: order.ticketNumber,
      deviceType: order.deviceType,
      deviceBrand: order.deviceBrand,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      service: order.service
        ? {
            name: order.service.name,
            estimatedDuration: order.service.estimatedDuration,
          }
        : null,
      statusHistory: order.statusHistory.map((h) => ({
        status: h.status,
        note: h.note,
        createdAt: h.createdAt,
      })),
    };

    return NextResponse.json({ order: publicOrder });
  } catch (error: any) {
    console.error('Error tracking order:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat mencari tiket.' },
      { status: 500 }
    );
  }
}
