import React from 'react';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { AdminInventoryManager } from '@/components/admin/AdminInventoryManager';
import { HardDrive } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminInventoryPage() {
  await requireAdmin();

  let items: any[] = [];
  try {
    const rawItems = await (prisma as any).inventoryItem.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Serialize Decimals to plain numbers for client component props
    items = rawItems.map((item: any) => ({
      ...item,
      purchasePrice: Number(item.purchasePrice) || 0,
      sellingPrice: Number(item.sellingPrice) || 0,
      createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: item.updatedAt?.toISOString() || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error loading admin inventory items:', error);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Inventaris & Sparepart</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Pusat manajemen stok suku cadang, peringatan stok menipis, valuasi aset, dan harga servis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Inventory Manager */}
      <AdminInventoryManager initialItems={items} />
    </div>
  );
}
