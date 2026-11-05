import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { inventoryItemSchema } from '@/lib/validations/inventory';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar seluruh inventaris & sparepart dengan metrik ringkasan
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';
    const category = searchParams.get('category') || '';
    const stockStatus = searchParams.get('status') || 'ALL';

    // Ambil seluruh data dari database
    const allItems = await (prisma as any).inventoryItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Hitung KPI Metrik Global
    let totalStock = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    allItems.forEach((item: any) => {
      const stock = Number(item.stock) || 0;
      const minStock = Number(item.minStock) || 0;
      const purchasePrice = Number(item.purchasePrice) || 0;

      totalStock += stock;
      totalValuation += stock * purchasePrice;

      if (stock === 0) {
        outOfStockCount += 1;
        lowStockCount += 1;
      } else if (stock <= minStock) {
        lowStockCount += 1;
      }
    });

    // Filter data sesuai kriteria pencarian & filter
    const filteredItems = allItems.filter((item: any) => {
      const stock = Number(item.stock) || 0;
      const minStock = Number(item.minStock) || 0;

      // Filter Search
      if (q) {
        const matchSku = item.sku?.toLowerCase().includes(q);
        const matchName = item.name?.toLowerCase().includes(q);
        const matchBrand = item.brand?.toLowerCase().includes(q);
        const matchCompat = item.compatibility?.toLowerCase().includes(q);
        const matchLoc = item.location?.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchBrand && !matchCompat && !matchLoc) {
          return false;
        }
      }

      // Filter Kategori
      if (category && category !== 'ALL') {
        if (item.category !== category) return false;
      }

      // Filter Status Stok
      if (stockStatus === 'OUT_OF_STOCK') {
        return stock === 0;
      } else if (stockStatus === 'LOW_STOCK') {
        return stock > 0 && stock <= minStock;
      } else if (stockStatus === 'IN_STOCK') {
        return stock > minStock;
      }

      return true;
    });

    return NextResponse.json({
      items: filteredItems,
      metrics: {
        totalItems: allItems.length,
        totalStock,
        totalValuation,
        lowStockCount,
        outOfStockCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat data inventaris.' }, { status: 500 });
  }
}

// POST: Tambah sparepart/komponen inventaris baru
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inventoryItemSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Validasi data gagal.';
      return NextResponse.json({ error: firstError, details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;

    // Cek duplikasi SKU
    const existingSku = await (prisma as any).inventoryItem.findUnique({
      where: { sku: data.sku },
    });

    if (existingSku) {
      return NextResponse.json(
        { error: `Kode SKU "${data.sku}" sudah terdaftar pada item lain.` },
        { status: 400 }
      );
    }

    const newItem = await (prisma as any).inventoryItem.create({
      data: {
        sku: data.sku.toUpperCase(),
        name: data.name,
        category: data.category,
        brand: data.brand && data.brand.trim() !== '' ? data.brand.trim() : null,
        compatibility: data.compatibility && data.compatibility.trim() !== '' ? data.compatibility.trim() : null,
        stock: data.stock,
        minStock: data.minStock,
        unit: data.unit,
        purchasePrice: data.purchasePrice,
        sellingPrice: data.sellingPrice,
        location: data.location && data.location.trim() !== '' ? data.location.trim() : null,
        condition: data.condition,
        notes: data.notes && data.notes.trim() !== '' ? data.notes.trim() : null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json(
      { message: 'Suku cadang baru berhasil ditambahkan!', item: newItem },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: error.message || 'Gagal menambahkan suku cadang.' }, { status: 500 });
  }
}
