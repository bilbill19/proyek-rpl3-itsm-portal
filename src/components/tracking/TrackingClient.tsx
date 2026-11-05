'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Wrench,
  Laptop,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calendar,
  Building2,
  Car,
  FileText,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

// 8 Alur Status Baku Sesuai Spesifikasi
const ORDER_STEPS = [
  { key: 'CREATED', label: 'Pesanan Dibuat', description: 'Tiket terdaftar di sistem' },
  { key: 'WAITING_CONFIRMATION', label: 'Menunggu Konfirmasi', description: 'Review awal customer service' },
  { key: 'DEVICE_RECEIVED', label: 'Perangkat Diterima', description: 'Fisik unit tiba di workshop' },
  { key: 'CHECKING', label: 'Diagnosa Kerusakan', description: 'Pengecekan teknis mikroskopis' },
  { key: 'IN_PROGRESS', label: 'Pengerjaan Service', description: 'Pergantian part & soldering' },
  { key: 'WAITING_APPROVAL', label: 'Menunggu Persetujuan', description: 'Konfirmasi biaya part tambahan' },
  { key: 'COMPLETED', label: 'Service Selesai', description: 'Lolos uji QC & siap diambil' },
  { key: 'DELIVERED', label: 'Perangkat Diserahkan', description: 'Garansi 90 hari aktif' },
];

function InnerTrackingSearch() {
  const searchParams = useSearchParams();
  const initialTicket = searchParams.get('ticket') || '';

  const [ticketInput, setTicketInput] = useState(initialTicket);
  const [searchedTicket, setSearchedTicket] = useState(initialTicket);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch ticket tracking data
  const handleTrack = async (ticketToSearch?: string) => {
    const target = (ticketToSearch || ticketInput).trim();
    if (!target) {
      setError('Silakan masukkan nomor tiket servis Anda.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setSearchedTicket(target);

    try {
      const res = await fetch(`/api/track?ticket=${encodeURIComponent(target)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Nomor tiket tidak ditemukan.');
      }

      setOrder(data.order);
    } catch (err: any) {
      setOrder(null);
      setError(err.message || 'Terjadi kesalahan saat melacak tiket.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialTicket) {
      handleTrack(initialTicket);
    }
  }, [initialTicket]);

  // Cari index status saat ini di urutan ORDER_STEPS
  const currentStepIndex = order
    ? ORDER_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
      {/* Header & Search Bar */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/40 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> Pelacakan Status Real-Time
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Tracking Service IT & Garansi
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Masukkan nomor tiket perbaikan untuk memantau progress pengerjaan teknisi, estimasi waktu, dan catatan diagnosa lab.
        </p>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="pt-2 flex flex-col sm:flex-row items-center gap-2 max-w-lg mx-auto"
        >
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Masukkan Nomor Tiket (cth: SRV-2026-0001)"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 uppercase font-mono transition-all"
            />
          </div>

          <Button
            type="submit"
            size="md"
            isLoading={isLoading}
            className="w-full sm:w-auto shrink-0 shadow-lg shadow-indigo-600/30 py-3"
          >
            <Search className="w-4 h-4" />
            <span>Lacak Sekarang</span>
          </Button>
        </form>

        {/* Sample Quick Ticket Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="text-slate-500">Contoh tiket:</span>
          {['SRV-2026-0001', 'ITSM-202608-0001'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => {
                setTicketInput(sample);
                handleTrack(sample);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400 max-w-2xl mx-auto animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold">Tiket Tidak Ditemukan:</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Order Details Result */}
      {order && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Banner Status Header */}
          <div className="rounded-3xl bg-gradient-to-r from-white via-indigo-50 to-white dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-indigo-500/30 p-6 sm:p-8 space-y-6 shadow-lg dark:shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-3.5 py-1 rounded-xl">
                    {order.ticketNumber}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getOrderStatusLabel(order.status).bg} ${getOrderStatusLabel(order.status).color}`}>
                    {getOrderStatusLabel(order.status).label}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
                  {order.deviceType} • {order.deviceBrand}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Didaftarkan pada {formatDate(order.createdAt)}
                </p>
              </div>

              <div className="text-left md:text-right bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 md:min-w-[200px]">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Estimasi Biaya:</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(order.estimatedPrice || order.finalPrice)}
                </span>
                {order.finalPrice && order.finalPrice !== order.estimatedPrice && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Biaya Final: {formatCurrency(order.finalPrice)}
                  </span>
                )}
              </div>
            </div>

            {/* 8-Stage Visual Progress Timeline Stepper */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Alur Progres Servis (8 Tahap)
                </span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Tahap {Math.max(1, currentStepIndex + 1)} dari 8
                </span>
              </div>

              {/* Desktop Stepper Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {ORDER_STEPS.map((step, idx) => {
                  const isPassed = currentStepIndex > idx;
                  const isCurrent = currentStepIndex === idx;
                  const isUpcoming = currentStepIndex < idx;

                  return (
                    <div
                      key={step.key}
                      className={`p-3 rounded-2xl border transition-all text-center flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-white shadow-lg shadow-indigo-600/20'
                          : isPassed
                          ? 'bg-emerald-100/70 dark:bg-emerald-950/20 border-emerald-500/50 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-500 opacity-60'
                      }`}
                    >
                      <div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mx-auto mb-2 ${
                            isPassed
                              ? 'bg-emerald-500 text-slate-950'
                              : isCurrent
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 animate-pulse'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-500'
                          }`}
                        >
                          {isPassed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                        </div>
                        <span className="text-[11px] font-bold block leading-tight">
                          {step.label}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-600 dark:text-slate-400 block mt-1 line-clamp-1">
                        {step.description}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Detail Breakdown: Info Perangkat & Timeline Riwayat Catatan Admin */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 6 Cols: Informasi Perangkat & Layanan */}
            <div className="lg:col-span-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Informasi Perangkat & Layanan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Jenis Perangkat:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{order.deviceType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Merk / Tipe:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{order.deviceBrand}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Layanan IT:</span>
                      <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {order.service?.name || 'Diagnosa Kerusakan Umum'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Metode Service:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {order.serviceMethod === 'ONSITE' ? '🚗 Teknisi ke Lokasi' : '🏢 Antar ke Workshop'}
                      </span>
                    </div>
                  </div>

                  {/* Deskripsi Masalah */}
                  <div className="space-y-1.5">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold block text-[11px]">
                      Deskripsi Keluhan Masalah:
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {order.problemDescription}
                    </div>
                  </div>

                  {/* Foto Kerusakan jika ada */}
                  {order.damageImage && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-[11px]">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Foto Kondisi Fisik Kerusakan:
                      </span>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 max-w-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={order.damageImage}
                          alt="Foto Kerusakan"
                          className="rounded-xl w-full max-h-52 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Info Garansi */}
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="font-bold block">Garansi Servis Resmi 90 Hari</span>
                      <span className="text-[10px] text-emerald-600/90 dark:text-emerald-400/80">
                        Berlaku sejak status diselesaikan dengan pengujian menyeluruh
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right 6 Cols: Timeline Riwayat Catatan Admin */}
            <div className="lg:col-span-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Timeline & Catatan Admin / Teknisi
                  </CardTitle>
                  <CardDescription>
                    Riwayat log lengkap setiap perubahan status perbaikan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {order.statusHistory.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      Belum ada riwayat catatan status.
                    </p>
                  ) : (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                      {order.statusHistory.map((history: any, idx: number) => {
                        const hStatusInfo = getOrderStatusLabel(history.status);
                        const isLatest = idx === 0;

                        return (
                          <div key={history.id ?? `${history.createdAt}-${idx}`} className="relative group">
                            {/* Bullet indicator */}
                            <div
                              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isLatest
                                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/50'
                                  : 'bg-white border-slate-300 dark:bg-slate-900 dark:border-slate-700 text-slate-500'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-white' : 'bg-slate-400 dark:bg-slate-600'}`} />
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${hStatusInfo.bg} ${hStatusInfo.color}`}>
                                  {hStatusInfo.label}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {formatDate(history.createdAt)}
                                </span>
                              </div>

                              {history.note && (
                                <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 leading-relaxed">
                                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                                    Catatan Resmi Teknisi:
                                  </span>
                                  {history.note}
                                </div>
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
        </div>
      )}
    </div>
  );
}

export function TrackingClient() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-5xl px-4 py-20 text-center text-slate-500 dark:text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 dark:text-indigo-400 mb-2" />
          <span>Memuat antarmuka pelacakan tiket...</span>
        </div>
      }
    >
      <InnerTrackingSearch />
    </Suspense>
  );
}
