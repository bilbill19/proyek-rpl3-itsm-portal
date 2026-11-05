'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  HardDrive,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Package,
  Layers,
  ArrowUpDown,
  TrendingUp,
  MapPin,
  Tag,
  Cpu,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  X,
  Sparkles,
  Info,
  ShieldCheck,
  Boxes,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { inventoryCategories, InventoryItemInput, StockAdjustmentInput } from '@/lib/validations/inventory';
import { InventoryItem, ItemCondition } from '@/types';

interface AdminInventoryManagerProps {
  initialItems: InventoryItem[];
}

export function AdminInventoryManager({ initialItems }: AdminInventoryManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>(initialItems);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingStockItem, setAdjustingStockItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);

  // Loading & Toast States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Stock Adjustment Form State
  const [stockAdjustType, setStockAdjustType] = useState<'IN' | 'OUT' | 'SET'>('IN');
  const [stockAdjustQty, setStockAdjustQty] = useState<number>(1);
  const [stockAdjustNote, setStockAdjustNote] = useState<string>('');

  // Item Form State (for Create & Edit)
  const defaultFormData: InventoryItemInput = {
    sku: '',
    name: '',
    category: inventoryCategories[0],
    brand: '',
    compatibility: '',
    stock: 1,
    minStock: 5,
    unit: 'Unit',
    purchasePrice: 0,
    sellingPrice: 0,
    location: '',
    condition: 'NEW',
    notes: '',
    isActive: true,
  };
  const [formData, setFormData] = useState<InventoryItemInput>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);

  // Calculate Global KPI Metrics
  const metrics = useMemo(() => {
    let totalStock = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
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

    return {
      totalVariants: items.length,
      totalStock,
      totalValuation,
      lowStockCount,
      outOfStockCount,
    };
  }, [items]);

  // Filtered List
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const stock = Number(item.stock) || 0;
      const minStock = Number(item.minStock) || 0;

      if (q) {
        const matchesSku = item.sku.toLowerCase().includes(q);
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesBrand = item.brand?.toLowerCase().includes(q) || false;
        const matchesCompat = item.compatibility?.toLowerCase().includes(q) || false;
        const matchesLoc = item.location?.toLowerCase().includes(q) || false;
        if (!matchesSku && !matchesName && !matchesBrand && !matchesCompat && !matchesLoc) {
          return false;
        }
      }

      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      if (selectedStockStatus === 'OUT_OF_STOCK' && stock !== 0) return false;
      if (selectedStockStatus === 'LOW_STOCK' && (stock === 0 || stock > minStock)) return false;
      if (selectedStockStatus === 'IN_STOCK' && stock <= minStock) return false;

      return true;
    });
  }, [items, searchQuery, selectedCategory, selectedStockStatus]);

  // Open Create Modal
  const handleOpenCreate = () => {
    // Generate simple auto SKU suggestion
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setFormData({
      ...defaultFormData,
      sku: `PRT-${randomSuffix}`,
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku,
      name: item.name,
      category: item.category,
      brand: item.brand || '',
      compatibility: item.compatibility || '',
      stock: Number(item.stock),
      minStock: Number(item.minStock),
      unit: item.unit || 'Unit',
      purchasePrice: Number(item.purchasePrice),
      sellingPrice: Number(item.sellingPrice),
      location: item.location || '',
      condition: item.condition,
      notes: item.notes || '',
      isActive: item.isActive,
    });
    setFormError(null);
  };

  // Open Quick Stock Adjust Modal
  const handleOpenStockAdjust = (item: InventoryItem) => {
    setAdjustingStockItem(item);
    setStockAdjustType('IN');
    setStockAdjustQty(1);
    setStockAdjustNote('');
  };

  // Handle Save (Create or Edit)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const isEdit = !!editingItem;
      const url = isEdit ? `/api/inventory/${editingItem.id}` : '/api/inventory';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data suku cadang.');

      if (isEdit) {
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? data.item : it)));
        setEditingItem(null);
        showToast('success', `Suku cadang "${data.item.name}" berhasil diperbarui!`);
      } else {
        setItems((prev) => [data.item, ...prev]);
        setIsCreateModalOpen(false);
        showToast('success', `Suku cadang baru "${data.item.name}" berhasil ditambahkan!`);
      }
      router.refresh();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Quick Stock Adjust Submit
  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingStockItem) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/inventory/${adjustingStockItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockAdjustment: {
            type: stockAdjustType,
            quantity: Number(stockAdjustQty),
            notes: stockAdjustNote,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui stok.');

      setItems((prev) => prev.map((it) => (it.id === adjustingStockItem.id ? data.item : it)));
      setAdjustingStockItem(null);
      showToast('success', data.message || 'Stok berhasil diperbarui!');
      router.refresh();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyesuaikan stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/inventory/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus suku cadang.');

      setItems((prev) => prev.filter((it) => it.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('success', data.message || 'Suku cadang berhasil dihapus.');
      router.refresh();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus suku cadang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-xs font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-200 border-emerald-500/30'
              : 'bg-rose-50 dark:bg-rose-950/90 text-rose-700 dark:text-rose-200 border-rose-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            aria-label="Tutup notifikasi"
            className="ml-2 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total SKUs */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Varian Sparepart</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">{metrics.totalVariants}</h3>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1 font-medium">
                  <Boxes className="w-3.5 h-3.5" /> SKU Terdaftar
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <HardDrive className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Physical Stock */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Fisik Unit Stok</p>
                <h3 className="text-2xl font-bold text-teal-700 dark:text-teal-300 mt-1 tracking-tight">{metrics.totalStock}</h3>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-1 flex items-center gap-1 font-medium">
                  <Package className="w-3.5 h-3.5" /> Unit Siap Pakai
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-600/10 border border-teal-500/20 flex items-center justify-center text-teal-700 dark:text-teal-400">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Asset Valuation */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Valuasi Total Aset</p>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tracking-tight">
                  {formatCurrency(metrics.totalValuation)}
                </h3>
                <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" /> Modal Tertanam
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Low Stock Warnings */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Peringatan Stok Menipis</p>
                <h3
                  className={`text-2xl font-bold mt-1 tracking-tight ${
                    metrics.lowStockCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {metrics.lowStockCount} Item
                </h3>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" /> {metrics.outOfStockCount} Habis Total
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  metrics.lowStockCount > 0
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                    : 'bg-slate-200 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search, Category Filters, & Actions */}
      <Card className="bg-white border-slate-200 shadow-xl backdrop-blur-md">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari sparepart (Nama, SKU, Merk, Rak, Kompatibilitas)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus teks pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <select
                aria-label="Filter status stok"
                value={selectedStockStatus}
                onChange={(e: any) => setSelectedStockStatus(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Status Stok</option>
                <option value="IN_STOCK">🟢 Stok Aman</option>
                <option value="LOW_STOCK">🟡 Stok Menipis (&le; Min)</option>
                <option value="OUT_OF_STOCK">🔴 Stok Habis (0)</option>
              </select>

              {/* Category Filter */}
              <select
                aria-label="Filter kategori suku cadang"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 max-w-[180px] truncate"
              >
                <option value="ALL">Semua Kategori</option>
                {inventoryCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Add New Item Button */}
              <Button
                onClick={handleOpenCreate}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Tambah Sparepart
              </Button>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3 h-3" /> Kategori:
            </span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              Semua ({items.length})
            </button>
            {inventoryCategories.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Inventory Table */}
      <Card className="bg-white border-slate-200 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-100 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3.5 px-4">Komponen & SKU</th>
                <th className="py-3.5 px-4">Kategori & Lokasi</th>
                <th className="py-3.5 px-4 text-center">Kuantitas Stok</th>
                <th className="py-3.5 px-4">Harga Beli / Jual</th>
                <th className="py-3.5 px-4 text-center">Margin</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-slate-600" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Tidak ada data suku cadang yang cocok.</p>
                      <p className="text-[11px] text-slate-500">
                        Coba ubah kata kunci pencarian atau bersihkan filter yang aktif.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const stock = Number(item.stock) || 0;
                  const minStock = Number(item.minStock) || 0;
                  const purchasePrice = Number(item.purchasePrice) || 0;
                  const sellingPrice = Number(item.sellingPrice) || 0;
                  const profit = sellingPrice - purchasePrice;
                  const marginPercent = purchasePrice > 0 ? Math.round((profit / purchasePrice) * 100) : 0;

                  const isOutOfStock = stock === 0;
                  const isLowStock = !isOutOfStock && stock <= minStock;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-200 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Col 1: SKU & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                {item.sku}
                              </span>
                              {item.condition !== 'NEW' && (
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                  {item.condition}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white text-xs mt-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                              {item.name}
                            </p>
                            {item.compatibility && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-xs mt-0.5">
                                {item.compatibility}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Category & Location */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700/50">
                          {item.category}
                        </span>
                        {item.brand && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium">Merk: {item.brand}</p>
                        )}
                        {item.location && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-600 dark:text-slate-400" /> {item.location}
                          </p>
                        )}
                      </td>

                      {/* Col 3: Stock Quantity */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 border ${
                              isOutOfStock
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                : isLowStock
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-rose-400' : isLowStock ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                            />
                            {stock} {item.unit}
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">Min: {minStock}</span>
                        </div>
                      </td>

                      {/* Col 4: Prices */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="text-slate-900 dark:text-white font-semibold text-xs">{formatCurrency(sellingPrice)}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">Modal: {formatCurrency(purchasePrice)}</p>
                        </div>
                      </td>

                      {/* Col 5: Margin */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            profit > 0
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          +{marginPercent}%
                        </span>
                      </td>

                      {/* Col 6: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Stock Adjust Button */}
                          <button
                            onClick={() => handleOpenStockAdjust(item)}
                            title="Penyesuaian Stok Cepat (+ / -)"
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-colors"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Item Button */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Rincian Sparepart"
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Item Button */}
                          <button
                            onClick={() => setDeleteTarget(item)}
                            title="Hapus Sparepart"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT SPAREPART                                          */}
      {/* ========================================================================= */}
      {(isCreateModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Data Suku Cadang' : 'Tambah Suku Cadang / Sparepart Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Lengkapi spesifikasi, stok awal, dan harga komponen workshop.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid 1: SKU & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Kode SKU <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="PRT-SSD-512"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nama Komponen Sparepart <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="SSD NVMe Kingston NV2 512GB"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Grid 2: Category & Brand & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Kategori <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {inventoryCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Merk / Brand</label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="Kingston / Asus / Corsair"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Kondisi</label>
                  <select
                    value={formData.condition}
                    onChange={(e: any) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NEW">Baru (NEW 100%)</option>
                    <option value="REFURBISHED">Refurbished Grade A</option>
                    <option value="SECOND">Second / Copotan</option>
                  </select>
                </div>
              </div>

              {/* Compatibility & Storage Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Kompatibilitas Perangkat</label>
                  <input
                    type="text"
                    value={formData.compatibility || ''}
                    onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
                    placeholder="Universal Laptop M.2 NVMe 2280"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Lokasi Rak / Lemari</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Rak A-02, Etalase Depan"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Stock, Min Stock, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-100 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Stok Awal <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Batas Minimum (Alert)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="Unit / Pcs / Tube / Keping"
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Prices: Purchase Price & Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-100 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800/80">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Harga Beli / Modal (Rp) <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Harga Jual / Servis (Rp) <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-emerald-700 dark:text-emerald-400 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Catatan Tambahan / Garansi</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contoh: Garansi resmi distributor 3 tahun. Sangat laris untuk upgrade SSD laptop."
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Sparepart'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: QUICK STOCK ADJUSTMENT (+ / -)                                   */}
      {/* ========================================================================= */}
      {adjustingStockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Penyesuaian Stok Cepat</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{adjustingStockItem.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingStockItem(null)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Stock Banner */}
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-400">Stok Saat Ini:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {adjustingStockItem.stock} {adjustingStockItem.unit}
              </span>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="space-y-4">
              {/* Adjustment Mode Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustType('IN')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                    stockAdjustType === 'IN'
                      ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>Stok Masuk (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockAdjustType('OUT')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                    stockAdjustType === 'OUT'
                      ? 'bg-rose-600/20 text-rose-700 dark:text-rose-300 border-rose-500/50 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MinusCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Stok Keluar (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStockAdjustType('SET')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                    stockAdjustType === 'SET'
                      ? 'bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/50 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Set Jumlah</span>
                </button>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {stockAdjustType === 'IN'
                    ? 'Jumlah Masuk (Restock)'
                    : stockAdjustType === 'OUT'
                    ? 'Jumlah Keluar (Terpakai)'
                    : 'Kuantitas Stok Baru'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAdjustQty}
                  onChange={(e) => setStockAdjustQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white font-bold text-center focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Reason / Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Alasan / Catatan Penyesuaian</label>
                <input
                  type="text"
                  value={stockAdjustNote}
                  onChange={(e) => setStockAdjustNote(e.target.value)}
                  placeholder="Contoh: Restock supplier / Servis #ITSM-001"
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustingStockItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Terapkan Penyesuaian'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hapus Suku Cadang?</h3>
                <p className="text-xs text-rose-400/90">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <p className="text-slate-600 dark:text-slate-300 font-semibold">{deleteTarget.name}</p>
              <p className="text-slate-500 font-mono text-[11px]">SKU: {deleteTarget.sku}</p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">Sisa Stok: {deleteTarget.stock} {deleteTarget.unit}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <Button
                onClick={handleDeleteItem}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
