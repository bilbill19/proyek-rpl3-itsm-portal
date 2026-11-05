'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Wrench,
  Laptop,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  Building2,
  Car,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User,
  Phone,
  Mail,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Save,
  AlertTriangle,
  X,
  History,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

// 8 Status Baku
const ORDER_STATUS_CHOICES = [
  { value: 'CREATED', label: '1. CREATED (Pesanan Dibuat)' },
  { value: 'WAITING_CONFIRMATION', label: '2. WAITING_CONFIRMATION (Menunggu Konfirmasi)' },
  { value: 'DEVICE_RECEIVED', label: '3. DEVICE_RECEIVED (Perangkat Diterima di Workshop)' },
  { value: 'CHECKING', label: '4. CHECKING (Sedang Diagnosa & Pemeriksaan)' },
  { value: 'IN_PROGRESS', label: '5. IN_PROGRESS (Pengerjaan Service Sedang Berjalan)' },
  { value: 'WAITING_APPROVAL', label: '6. WAITING_APPROVAL (Menunggu Persetujuan Customer)' },
  { value: 'COMPLETED', label: '7. COMPLETED (Service Selesai & Lolos QC)' },
  { value: 'DELIVERED', label: '8. DELIVERED (Perangkat Diserahkan / Selesai Total)' },
];

interface AdminOrderDetailManagerProps {
  initialOrder: any;
}

export function AdminOrderDetailManager({ initialOrder }: AdminOrderDetailManagerProps) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(initialOrder);

  // Form State
  const [status, setStatus] = useState<string>(initialOrder.status);
  const [note, setNote] = useState<string>('');
  const [estimatedPrice, setEstimatedPrice] = useState<string>(
    initialOrder.estimatedPrice ? String(initialOrder.estimatedPrice) : ''
  );
  const [finalPrice, setFinalPrice] = useState<string>(
    initialOrder.finalPrice ? String(initialOrder.finalPrice) : ''
  );

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Pre-submit validation
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  // Submit Update
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          note,
          estimatedPrice: estimatedPrice ? Number(estimatedPrice) : null,
          finalPrice: finalPrice ? Number(finalPrice) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui data pesanan.');
      }

      setOrder(data.order);
      setNote(''); // reset note textarea
      setToastMessage({
        type: 'success',
        text: 'Data pesanan dan status history berhasil diperbarui!',
      });
      router.refresh();
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        text: err.message || 'Terjadi kesalahan saat menyimpan perubahan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusInfo = getOrderStatusLabel(order.status);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Antrian Pesanan
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-mono">ID: {order.id}</span>
        </div>
      </div>

      {/* Toast Alert */}
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
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner Overview — design token mengikuti banner "Selamat Datang"
          di Dashboard Customer: gradient indigo→putih→ungu (Light), slate/indigo
          gelap (Dark), border indigo-500/30, glow indigo, teks slate-900. */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-500/30 p-6 sm:p-8 space-y-6 shadow-lg dark:shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-base sm:text-lg font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-3.5 py-1 rounded-xl">
                {order.ticketNumber}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
              {order.deviceType} • {order.deviceBrand}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Diajukan pada {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="text-left md:text-right bg-white/80 dark:bg-slate-950/70 p-4 rounded-2xl border border-indigo-500/25 dark:border-slate-800 md:min-w-[220px]">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Estimasi Biaya:</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(order.estimatedPrice || order.finalPrice)}
            </span>
            {order.finalPrice && (
              <span className="text-[11px] text-slate-600 dark:text-slate-300 block mt-0.5">
                Biaya Final:{' '}
                <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(order.finalPrice)}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Quick Spec Pills — tiga kartu info layanan/metode/pemilik satu gaya */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs relative z-10">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/40 border border-indigo-500/20 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-500 text-[10px] block">Layanan Terdaftar:</span>
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold truncate block">
              {order.service?.name || 'Diagnosa Kerusakan Umum'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/40 border border-indigo-500/20 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-500 text-[10px] block">Metode Layanan:</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">
              {order.serviceMethod === 'ONSITE' ? '🚗 Teknisi Datang ke Lokasi' : '🏢 Antar ke Workshop'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-950/40 border border-indigo-500/20 dark:border-slate-800/60">
            <span className="text-slate-500 dark:text-slate-500 text-[10px] block">Pemilik Perangkat:</span>
            <span className="text-slate-900 dark:text-white font-semibold">{order.customer?.name}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Management Form (Left) & Details / History (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Interactive Status & Price Update Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-indigo-500/30 shadow-xl">
            <CardHeader className="border-b border-slate-200 pb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Kontrol Status & Billing Admin
              </div>
              <CardTitle className="text-lg">Update Progres & Penyesuaian Biaya</CardTitle>
              <CardDescription>
                Pilih tahapan status servis, tambahkan catatan diagnosa teknisi, dan tentukan biaya final.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleOpenConfirm} className="space-y-5">
                {/* Status Dropdown */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Tahapan Status Pengerjaan (8 Status)
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {ORDER_STATUS_CHOICES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price Adjustments Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Estimasi Harga (IDR)
                    </label>
                    <input
                      type="number"
                      placeholder="cth: 150000"
                      value={estimatedPrice}
                      onChange={(e) => setEstimatedPrice(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Harga Final (IDR)
                    </label>
                    <input
                      type="number"
                      placeholder="cth: 200000"
                      value={finalPrice}
                      onChange={(e) => setFinalPrice(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Technical Note / Catatan Admin */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Catatan Teknisi / Admin (Otomatis Masuk Riwayat)
                    </label>
                    <span className="text-[10px] text-slate-500">Akan tampil di timeline customer</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan perkembangan perbaikan, hasil diagnosa, sparepart yang diganti, atau kendala pengerjaan..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Action Bar */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    className="w-full sm:w-auto shadow-lg shadow-indigo-600/30"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Pesanan</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Customer & Location Card */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Informasi Pelanggan & Lokasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Nama Pelanggan:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{order.customer?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Alamat Email:</span>
                  <span className="text-indigo-700 dark:text-indigo-300">{order.customer?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">No. WhatsApp/Telp:</span>
                  <span className="text-slate-900 dark:text-white font-mono">{order.customer?.phone || '-'}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <span className="text-slate-500 text-[10px] block mb-1">Alamat Penjemputan / Kunjungan:</span>
                  <p className="font-medium text-slate-900 dark:text-white">{order.address || 'Diantar langsung ke workshop utama.'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Cols: Problem Details, Damage Photo & Timeline History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Keluhan & Foto Kerusakan */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Keluhan & Foto Fisik Kerusakan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {order.problemDescription}
              </div>

              {order.damageImage && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Foto Lampiran Pelanggan:
                  </span>
                  <div
                    onClick={() => setShowImageModal(true)}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 cursor-pointer hover:border-indigo-500/50 transition-colors group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.damageImage}
                      alt="Foto Kerusakan"
                      className="rounded-xl w-full max-h-52 object-contain group-hover:scale-[1.02] transition-transform"
                    />
                    <span className="text-[10px] text-center block text-slate-500 mt-1">
                      Klik untuk memperbesar foto
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Timeline Riwayat Progres */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Log Riwayat Status & Catatan
              </CardTitle>
              <CardDescription>Catatan seluruh perubahan status dari awal pendaftaran</CardDescription>
            </CardHeader>
            <CardContent>
              {order.statusHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Belum ada catatan riwayat status.</p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {order.statusHistory.map((history: any, idx: number) => {
                    const hStatusInfo = getOrderStatusLabel(history.status);
                    const isLatest = idx === 0;

                    return (
                      <div key={history.id} className="relative group">
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isLatest
                              ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/50'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-white' : 'bg-slate-200 dark:bg-slate-600'}`} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${hStatusInfo.bg}`}>
                              {hStatusInfo.label}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {formatDate(history.createdAt)}
                            </span>
                          </div>

                          {history.note && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 leading-relaxed mt-1">
                              {history.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Konfirmasi Perubahan Tiket</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">Periksa kembali data sebelum disimpan</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Nomor Tiket:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{order.ticketNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">Status Baru:</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">{status}</span>
              </div>
              {estimatedPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Estimasi Biaya:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(Number(estimatedPrice))}</span>
                </div>
              )}
              {finalPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Biaya Final:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(Number(finalPrice))}</span>
                </div>
              )}
              {note && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 text-[10px] block mb-0.5">Catatan Log:</span>
                  <p className="text-slate-600 dark:text-slate-300 italic line-clamp-2">&ldquo;{note}&rdquo;</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSubmit}
                isLoading={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
              >
                Ya, Simpan Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Full Preview Modal */}
      {showImageModal && order.damageImage && (
        <div
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white dark:bg-slate-900/80 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.damageImage}
              alt="Foto Kerusakan Full"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
