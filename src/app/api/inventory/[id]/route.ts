import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { inventoryItemSchema, stockAdjustmentSchema } from '@/lib/validations/inventory';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Ambil detail suku cadang berdasarkan ID
export async function GET(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item inventaris tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT / PATCH: Update data suku cadang atau penyesuaian stok cepat
export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const currentItem = await (prisma as any).inventoryItem.findUnique({
      where: { id },
    });

    if (!currentItem) {
      return NextResponse.json({ error: 'Item inventaris tidak ditemukan.' }, { status: 404 });
    }

    const body = await request.json();

    // Mode 1: Quick Stock Adjustment
    if (body.stockAdjustment) {
      const parsedAdjustment = stockAdjustmentSchema.safeParse(body.stockAdjustment);
      if (!parsedAdjustment.success) {
        const firstError = Object.values(parsedAdjustment.error.flatten().fieldErrors)[0]?.[0] || 'Validasi penyesuaian stok gagal.';
        return NextResponse.json({ error: firstError }, { status: 400 });
      }

      const { type, quantity, notes } = parsedAdjustment.data;
      let newStock = currentItem.stock;

      if (type === 'IN') {
        newStock += quantity;
      } else if (type === 'OUT') {
        if (currentItem.stock < quantity) {
          return NextResponse.json(
            { error: `Kuantitas pengeluaran (${quantity}) melebihi stok yang tersedia (${currentItem.stock}).` },
            { status: 400 }
          );
        }
        newStock = Math.max(0, currentItem.stock - quantity);
      } else if (type === 'SET') {
        newStock = quantity;
      }

      const updated = await (prisma as any).inventoryItem.update({
        where: { id },
        data: {
          stock: newStock,
          notes: notes ? `${currentItem.notes || ''}\n[Stok ${type}]: ${notes}`.trim() : currentItem.notes,
        },
      });

      return NextResponse.json({
        message: `Stok berhasil diperbarui menjadi ${newStock} ${updated.unit}.`,
        item: updated,
      });
    }

    // Mode 2: Full Edit Update
    const parsed = inventoryItemSchema.partial().safeParse(body);
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Validasi pembaruan gagal.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;

    // Cek SKU jika diubah
    if (data.sku && data.sku.toUpperCase() !== currentItem.sku) {
      const existingSku = await (prisma as any).inventoryItem.findUnique({
        where: { sku: data.sku.toUpperCase() },
      });
      if (existingSku && existingSku.id !== id) {
        return NextResponse.json(
          { error: `Kode SKU "${data.sku}" telah digunakan oleh item lain.` },
          { status: 400 }
        );
      }
    }

    const updatedItem = await (prisma as any).inventoryItem.update({
      where: { id },
      data: {
        ...(data.sku && { sku: data.sku.toUpperCase() }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.brand !== undefined && { brand: data.brand && data.brand.trim() !== '' ? data.brand.trim() : null }),
        ...(data.compatibility !== undefined && {
          compatibility: data.compatibility && data.compatibility.trim() !== '' ? data.compatibility.trim() : null,
        }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.location !== undefined && {
          location: data.location && data.location.trim() !== '' ? data.location.trim() : null,
        }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.notes !== undefined && { notes: data.notes && data.notes.trim() !== '' ? data.notes.trim() : null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json({
      message: 'Data suku cadang berhasil diperbarui!',
      item: updatedItem,
    });
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: error.message || 'Gagal memperbarui item.' }, { status: 500 });
  }
}

// DELETE: Hapus suku cadang dari inventaris
export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const item = await (prisma as any).inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item inventaris tidak ditemukan.' }, { status: 404 });
    }

    await (prisma as any).inventoryItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: `Suku cadang "${item.name}" (${item.sku}) berhasil dihapus.` });
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: error.message || 'Gagal menghapus suku cadang.' }, { status: 500 });
  }
}
