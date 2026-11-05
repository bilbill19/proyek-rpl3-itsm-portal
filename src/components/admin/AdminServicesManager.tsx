'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wrench,
  Plus,
  Clock,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Sparkles,
  Layers,
  Laptop,
  Cpu,
  RefreshCw,
  HardDrive,
  ShieldAlert,
  Wifi,
  Headphones,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

// Helper to choose icon based on service name
function getServiceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('laptop') || n.includes('macbook')) return Laptop;
  if (n.includes('install') || n.includes('os')) return RefreshCw;
  if (n.includes('upgrade') || n.includes('ssd') || n.includes('ram')) return HardDrive;
  if (n.includes('virus') || n.includes('malware')) return ShieldAlert;
  if (n.includes('hardware') || n.includes('motherboard')) return Cpu;
  if (n.includes('jaringan') || n.includes('wifi')) return Wifi;
  if (n.includes('support')) return Headphones;
  return Wrench;
}

interface AdminServicesManagerProps {
  initialServices: any[];
}

export function AdminServicesManager({ initialServices }: AdminServicesManagerProps) {
  const router = useRouter();
  const [services, setServices] = useState<any[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle Loading ID
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        srv.name.toLowerCase().includes(q) ||
        srv.description.toLowerCase().includes(q) ||
        srv.estimatedDuration.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && srv.isActive) ||
        (statusFilter === 'INACTIVE' && !srv.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [services, searchQuery, statusFilter]);

  // Toggle Active / Inactive
  const handleToggleStatus = async (srv: any) => {
    setTogglingId(srv.id);
    setToastMessage(null);

    try {
      const newStatus = !srv.isActive;
      const res = await fetch(`/api/services/${srv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status.');

      setServices((prev) =>
        prev.map((item) => (item.id === srv.id ? { ...item, isActive: newStatus } : item))
      );

      setToastMessage({
        type: 'success',
        text: `Layanan "${srv.name}" berhasil di-${newStatus ? 'aktifkan' : 'nonaktifkan'}.`,
      });
      router.refresh();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Gagal mengubah status layanan.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Service
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setToastMessage(null);

    try {
      const res = await fetch(`/api/services/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus layanan.');

      // Update local state
      setServices((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setToastMessage({
        type: 'success',
        text: data.message || 'Layanan berhasil diproses.',
      });
      setDeleteTarget(null);
      router.refresh();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Gagal menghapus layanan.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500/40 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Bar: Search, Status Tabs, and Add Button */}
      {/* flex-wrap: pada layar sempit (mis. 800px) tombol CTA turun ke baris
          baru alih-alih terpotong di tepi viewport. */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4">
        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari layanan IT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full sm:w-auto">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === mode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode === 'ALL' ? 'Semua' : mode === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
              </button>
            ))}
          </div>
        </div>

        {/* Add Service CTA */}
        <Link href="/admin/services/new" className="w-full sm:w-auto">
          <Button size="md" className="w-full sm:w-auto shadow-lg shadow-indigo-600/30">
            <Plus className="w-4 h-4" />
            <span>Tambah Layanan Baru</span>
          </Button>
        </Link>
      </div>

      {/* Services Grid Cards */}
      {filteredServices.length === 0 ? (
        <Card className="text-center py-16 space-y-4">
          <CardContent className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
              <Wrench className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tidak Ada Layanan Ditemukan</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Belum ada layanan yang sesuai dengan pencarian atau filter yang Anda pilih.
            </p>
            <div className="pt-2">
              <Link href="/admin/services/new">
                <Button size="sm">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Layanan Pertama</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((srv) => {
            const Icon = getServiceIcon(srv.name);
            return (
              <Card
                key={srv.id}
                className={`flex flex-col justify-between transition-all duration-200 ${
                  !srv.isActive ? 'border-slate-200 dark:border-slate-800/60 opacity-75 bg-slate-100 dark:bg-slate-950/40' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar: Icon, Active Status Badge, and Duration */}
                  {/* flex-wrap + whitespace-nowrap: badge "Publikasi Aktif" dan
                      label SLA tidak pernah terpotong/pecah dua baris. */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        srv.isActive ? 'bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        srv.isActive
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}>
                        {srv.isActive ? '● Publikasi Aktif' : '○ Non-Aktif'}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" /> {srv.estimatedDuration}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 break-words">{srv.name}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {srv.description}
                    </p>
                  </div>
                </div>

                {/* Bottom Bar: Price & Actions */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Tarif Estimasi:</span>
                      <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(srv.price)}
                      </span>
                    </div>

                    {/* Active/Inactive Toggle Button */}
                    <button
                      onClick={() => handleToggleStatus(srv)}
                      disabled={togglingId === srv.id}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                        srv.isActive
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-500/30'
                      }`}
                      title="Klik untuk mengubah status aktif / nonaktif"
                    >
                      {togglingId === srv.id
                        ? 'Memproses...'
                        : srv.isActive
                        ? 'Matikan'
                        : 'Aktifkan'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link href={`/admin/services/${srv.id}/edit`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full text-xs">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>
                    </Link>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteTarget(srv)}
                      className="px-3"
                      title="Hapus Layanan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Layanan Service</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tindakan ini membutuhkan konfirmasi</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-300">
              <p>
                Apakah Anda yakin ingin menghapus layanan <strong className="text-slate-900 dark:text-white">&ldquo;{deleteTarget.name}&rdquo;</strong>?
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Jika terdapat pesanan servis pelanggan yang pernah menggunakan layanan ini, sistem akan secara otomatis menonaktifkan status layanan untuk menjaga integritas riwayat pesanan.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
              >
                Ya, Hapus Layanan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
