import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
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
  FileText,
  Image as ImageIcon,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { requireCustomer } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CustomerOrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await requireCustomer();

  // 1. Ambil data pesanan dari database
  const order = await prisma.serviceOrder.findUnique({
    where: { id: params.id },
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      service: true,
      statusHistory: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // 2. Proteksi Keamanan: Jika order tidak ada atau BUKAN milik customer yang sedang login -> 404
  if (!order || order.customerId !== session.id) {
    notFound();
  }

  const statusInfo = getOrderStatusLabel(order.status);

  // Daftar alur status untuk visual stepper
  const allStages = [
    { key: 'CREATED', label: 'Pesanan Dibuat' },
    { key: 'DEVICE_RECEIVED', label: 'Perangkat Diterima' },
    { key: 'CHECKING', label: 'Diagnosa Kerusakan' },
    { key: 'IN_PROGRESS', label: 'Pengerjaan Service' },
    { key: 'COMPLETED', label: 'Selesai & Bergaransi' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/orders/new">
            <Button size="sm" variant="secondary">
              <Wrench className="w-3.5 h-3.5" />
              <span>Buat Pesanan Baru</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Order Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-50 via-indigo-50 to-slate-50 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-lg dark:shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-xl">
                {order.ticketNumber}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bg}`}>
                {statusInfo.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
              {order.deviceType} • {order.deviceBrand}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Dipesan pada {formatDate(order.createdAt)}
            </p>
          </div>

          <div className="text-left md:text-right bg-slate-100 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 md:min-w-[200px]">
            <span className="text-[11px] text-slate-600 dark:text-slate-400 block font-medium">Estimasi Biaya:</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(order.estimatedPrice || order.finalPrice)}
            </span>
            {order.finalPrice && order.finalPrice !== order.estimatedPrice && (
              <span className="text-[10px] text-slate-600 dark:text-slate-400 block mt-0.5">
                Biaya Final: {formatCurrency(order.finalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Metrik Ringkas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Layanan:</span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold truncate block max-w-[180px]">
                {order.service?.name || 'Diagnosa Kerusakan Umum'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              {order.serviceMethod === 'ONSITE' ? (
                <Car className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Metode Service:</span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold">
                {order.serviceMethod === 'ONSITE'
                  ? 'Teknisi ke Lokasi'
                  : 'Antar ke Workshop'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Garansi Servis:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Hingga 90 Hari Resmi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content: Rincian Kerusakan & Timeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Detail Pesanan & Kerusakan */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Deskripsi Masalah */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Deskripsi Masalah & Gejala
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {order.problemDescription}
              </div>

              {/* Foto Kerusakan jika diupload */}
              {order.damageImage && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 text-xs">
                    <ImageIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Foto Kerusakan Perangkat:
                  </span>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 max-w-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.damageImage}
                      alt="Foto Fisik Kerusakan"
                      className="rounded-xl w-full max-h-64 object-contain"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card: Informasi Metode Layanan & Alamat */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Lokasi & Metode Penanganan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Metode Penyerahan:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {order.serviceMethod === 'ONSITE'
                      ? '🚗 Teknisi Datang ke Lokasi (Home Service)'
                      : '🏢 Antar Perangkat ke Workshop'}
                  </span>
                </div>

                {order.serviceMethod === 'DROP_OFF' ? (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Alamat Workshop Utama:</span>
                    <p>Jl. Merdeka No. 45, Jakarta Selatan (Buka Setiap Hari: 09.00 - 20.00 WIB)</p>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-300">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">Alamat Kunjungan Teknisi:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{order.address || 'Alamat belum dilengkapi.'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Cols: Riwayat Status & Timeline */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Riwayat Progres Servis
              </CardTitle>
              <CardDescription>Catatan perkembangan pengerjaan teknisi secara real-time</CardDescription>
            </CardHeader>
            <CardContent>
              {order.statusHistory.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Belum ada catatan riwayat status.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {order.statusHistory.map((history, idx) => {
                    const hStatusInfo = getOrderStatusLabel(history.status);
                    const isLatest = idx === 0;

                    return (
                      <div key={history.id} className="relative group">
                        {/* Timeline Circle */}
                        <div
                          className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isLatest
                              ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/50'
                              : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${isLatest ? 'bg-white' : 'bg-slate-600'}`} />
                        </div>

                        {/* Timeline Item Content */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hStatusInfo.bg}`}>
                              {hStatusInfo.label}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {formatDate(history.createdAt)}
                            </span>
                          </div>

                          {history.note && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 leading-relaxed mt-1">
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
    </div>
  );
}
