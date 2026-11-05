'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { normalizePhone } from '@/lib/whatsapp/phone';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Phone,
  Mail,
  Calendar,
  Wrench,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  Eye,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ShoppingBag,
  Layers,
  FileText,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils';

interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalSpent: number;
  lastOrderDate?: string | null;
  conversationsCount: number;
  recentOrders: {
    id: string;
    ticketNumber: string;
    deviceType: string;
    deviceBrand: string;
    status: string;
    price: number;
    createdAt: string;
  }[];
}

interface AdminCustomersManagerProps {
  initialCustomers: CustomerSummary[];
}

export function AdminCustomersManager({ initialCustomers }: AdminCustomersManagerProps) {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerSummary[]>(initialCustomers);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'HAS_ORDERS' | 'NO_ORDERS'>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'ORDERS_COUNT' | 'TOTAL_SPENT' | 'NAME_ASC'>('NEWEST');

  // Modal States
  const [viewingCustomer, setViewingCustomer] = useState<CustomerSummary | null>(null);
  const [customerDetailData, setCustomerDetailData] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const [editingCustomer, setEditingCustomer] = useState<CustomerSummary | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [editFormError, setEditFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<CustomerSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Global KPI Calculations
  const metrics = useMemo(() => {
    let totalSpent = 0;
    let activeCustomerCount = 0;

    customers.forEach((c) => {
      totalSpent += c.totalSpent;
      if (c.activeOrders > 0) activeCustomerCount++;
    });

    return {
      totalCustomers: customers.length,
      activeCustomers: activeCustomerCount,
      totalRevenue: totalSpent,
      avgSpend: customers.length > 0 ? Math.round(totalSpent / customers.length) : 0,
    };
  }, [customers]);

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q) || false;
        if (!matchName && !matchEmail && !matchPhone) return false;
      }

      if (statusFilter === 'ACTIVE' && c.activeOrders === 0) return false;
      if (statusFilter === 'HAS_ORDERS' && c.totalOrders === 0) return false;
      if (statusFilter === 'NO_ORDERS' && c.totalOrders > 0) return false;

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'ORDERS_COUNT') return b.totalOrders - a.totalOrders;
      if (sortBy === 'TOTAL_SPENT') return b.totalSpent - a.totalSpent;
      if (sortBy === 'NAME_ASC') return a.name.localeCompare(b.name);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [customers, searchQuery, statusFilter, sortBy]);

  // Handle View Detail Modal
  const handleOpenDetail = async (c: CustomerSummary) => {
    setViewingCustomer(c);
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/customers/${c.id}`);
      const data = await res.json();
      if (res.ok) {
        setCustomerDetailData(data.customer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle Edit Modal Open
  const handleOpenEdit = (c: CustomerSummary) => {
    setEditingCustomer(c);
    setEditFormData({
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      password: '',
    });
    setEditFormError(null);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setIsSubmitting(true);
    setEditFormError(null);

    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui profil.');

      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? { ...c, ...data.customer } : c))
      );
      setEditingCustomer(null);
      showToast('success', 'Data profil pelanggan berhasil diperbarui!');
      router.refresh();
    } catch (err: any) {
      setEditFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Customer
  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/customers/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pelanggan.');

      setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('success', data.message || 'Akun pelanggan berhasil dihapus.');
      router.refresh();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menghapus akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper WhatsApp Phone format — memakai normalizePhone BERSAMA (satu
  // logika dengan dispatcher): tangani 08xx / 8xx / 62xx / +62 / 0062,
  // hasil selalu E.164 polos 62… (tanpa spasi/tanda). Nomor tak valid → null
  // (tombol tidak dirender — guard `waLink &&` sudah ada).
  const getWhatsAppLink = (phone?: string | null, name?: string) => {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return null;
    const message = encodeURIComponent(`Halo ${name || 'Pelanggan'}, kami dari tim IT Service Management (ITSM)...`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
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
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} aria-label="Tutup notifikasi" className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Customers */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Pelanggan Terdaftar</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">{metrics.totalCustomers}</h3>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1 font-medium">
                  <UserCheck className="w-3.5 h-3.5" /> Akun Aktif
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Active Servicing Customers */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Sedang Ada Servis Aktif</p>
                <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1 tracking-tight">{metrics.activeCustomers}</h3>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" /> Dalam Pengerjaan
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Wrench className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Total Revenue from Customers */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Omset Servis</p>
                <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tracking-tight">
                  {formatCurrency(metrics.totalRevenue)}
                </h3>
                <p className="text-[11px] text-emerald-400/80 mt-1 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" /> Akumulasi Transaksi
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Average Spend per Customer */}
        <Card className="bg-white border-slate-200 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Rata-rata Nilai Servis</p>
                <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1 tracking-tight">
                  {formatCurrency(metrics.avgSpend)}
                </h3>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3.5 h-3.5" /> ARPU Pelanggan
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search, Status Filter & Sorting */}
      <Card className="bg-white border-slate-200 shadow-xl backdrop-blur-md">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pelanggan (Nama, Email, No. WhatsApp)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
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

            {/* Filter & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Activity Status */}
              <select
                aria-label="Filter status aktivitas pelanggan"
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Pelanggan</option>
                <option value="ACTIVE">⚡ Sedang Ada Servis Aktif</option>
                <option value="HAS_ORDERS">📦 Pernah Order Servis</option>
                <option value="NO_ORDERS">🆕 Belum Ada Order</option>
              </select>

              {/* Sorting */}
              <select
                aria-label="Urutkan data pelanggan"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="NEWEST">Terdaftar Terbaru</option>
                <option value="ORDERS_COUNT">Pesanan Terbanyak</option>
                <option value="TOTAL_SPENT">Total Omset Tertinggi</option>
                <option value="NAME_ASC">Nama (A - Z)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Customers Table */}
      <Card className="bg-white border-slate-200 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800/90 bg-slate-100 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-3.5 px-4">Profil Pelanggan</th>
                <th className="py-3.5 px-4">Kontak & WhatsApp</th>
                <th className="py-3.5 px-4 text-center">Tiket Servis</th>
                <th className="py-3.5 px-4">Total Pengeluaran</th>
                <th className="py-3.5 px-4">Aktivitas Terakhir</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-600 dark:text-slate-300">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Tidak ada pelanggan yang cocok.</p>
                      <p className="text-[11px] text-slate-500">
                        Coba gunakan kata kunci lain atau ubah filter pencarian.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const waLink = getWhatsAppLink(c.phone, c.name);

                  return (
                    <tr key={c.id} className="hover:bg-slate-200 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Col 1: Customer Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-600/20 shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-xs group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-500" /> Bergabung {formatDate(c.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Contact & WhatsApp */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-500" /> {c.email}
                          </p>
                          {c.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" /> {c.phone}
                              </span>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded transition-colors"
                                >
                                  <MessageCircle className="w-3 h-3" /> Chat WA
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Tanpa No. HP</span>
                          )}
                        </div>
                      </td>

                      {/* Col 3: Orders Summary */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {c.totalOrders} <span className="font-normal text-slate-600 dark:text-slate-400 text-[10px]">Tiket</span>
                          </span>
                          {c.activeOrders > 0 ? (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mt-1 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              {c.activeOrders} Aktif
                            </span>
                          ) : c.totalOrders > 0 ? (
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded mt-1">
                              Semua Selesai
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 mt-1">Belum order</span>
                          )}
                        </div>
                      </td>

                      {/* Col 4: Total Spent */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                            {c.totalSpent > 0 ? formatCurrency(c.totalSpent) : 'Rp 0'}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {c.completedOrders} tiket berhasil dibayar
                          </p>
                        </div>
                      </td>

                      {/* Col 5: Last Activity */}
                      <td className="py-3.5 px-4">
                        {c.lastOrderDate ? (
                          <div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                              {formatDate(c.lastOrderDate)}
                            </p>
                            {c.recentOrders[0] && (
                              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                                #{c.recentOrders[0].ticketNumber}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">Belum ada aktivitas</span>
                        )}
                      </td>

                      {/* Col 6: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Detail Button */}
                          <button
                            onClick={() => handleOpenDetail(c)}
                            title="Lihat Riwayat & Profil Lengkap"
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Data Pelanggan"
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteTarget(c)}
                            title="Hapus Akun Pelanggan"
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
      {/* MODAL 1: DETAIL & RIWAYAT LENGKAP PELANGGAN                               */}
      {/* ========================================================================= */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {viewingCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">{viewingCustomer.name}</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{viewingCustomer.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewingCustomer(null);
                  setCustomerDetailData(null);
                }}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">No. WhatsApp</p>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                    {viewingCustomer.phone || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Order</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {viewingCustomer.totalOrders} Tiket
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Servis Aktif</p>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                    {viewingCustomer.activeOrders} Unit
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Belanja</p>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {formatCurrency(viewingCustomer.totalSpent)}
                  </p>
                </div>
              </div>

              {/* Order History Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Riwayat Seluruh Tiket Servis
                </h4>

                {isLoadingDetail ? (
                  <div className="py-8 text-center text-slate-500 text-xs">Memuat riwayat tiket...</div>
                ) : customerDetailData?.orders?.length > 0 ? (
                  <div className="space-y-2.5">
                    {customerDetailData.orders.map((order: any) => (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                              {order.ticketNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {order.deviceBrand} ({order.deviceType})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">
                            {order.problemDescription}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatDate(order.createdAt)} • Layanan: {order.serviceName}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                order.status === 'COMPLETED' || order.status === 'DELIVERED'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {order.status}
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                              {formatCurrency(order.finalPrice || order.estimatedPrice)}
                            </p>
                          </div>

                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-500 text-xs bg-slate-100 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                    Pelanggan ini belum pernah membuat pesanan servis.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT DATA PELANGGAN                                              */}
      {/* ========================================================================= */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit Data Pelanggan</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{editingCustomer.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              {editFormError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Reset Password Baru <span className="text-slate-500 font-normal">(Kosongkan jika tidak ingin mengubah)</span>
                </label>
                <input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
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
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hapus Akun Pelanggan?</h3>
                <p className="text-xs text-rose-400/90">Seluruh riwayat pesanan pelanggan ini juga akan terhapus.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <p className="text-slate-700 dark:text-slate-200 font-semibold">{deleteTarget.name}</p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">{deleteTarget.email}</p>
              <p className="text-slate-500 text-[11px]">Total Tiket: {deleteTarget.totalOrders} pesanan</p>
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
                onClick={handleDeleteCustomer}
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
