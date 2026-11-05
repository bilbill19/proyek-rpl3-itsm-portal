'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Wrench,
  DollarSign,
  Clock,
  Sparkles,
  Save,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ServiceFormProps {
  initialData?: {
    id?: string;
    name: string;
    description: string;
    price: number | string;
    estimatedDuration: string;
    image?: string | null;
    isActive: boolean;
  };
  isEdit?: boolean;
}

export function ServiceForm({ initialData, isEdit = false }: ServiceFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price !== undefined ? String(initialData.price) : '',
    estimatedDuration: initialData?.estimatedDuration || '',
    image: initialData?.image || '',
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side quick checks
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      setError('Nama layanan minimal 3 karakter.');
      return;
    }
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setError('Deskripsi layanan minimal 10 karakter.');
      return;
    }
    if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      setError('Tarif layanan harus berupa angka positif.');
      return;
    }
    if (!formData.estimatedDuration.trim() || formData.estimatedDuration.trim().length < 2) {
      setError('Estimasi durasi minimal 2 karakter (cth: 2 - 4 Jam).');
      return;
    }

    setIsLoading(true);

    try {
      const url = isEdit ? `/api/services/${initialData?.id}` : '/api/services';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat menyimpan layanan.');
      }

      router.push('/admin/services');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data layanan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog Layanan
      </Link>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> {isEdit ? 'Mode Edit Layanan' : 'Layanan Baru'}
          </div>
          <CardTitle className="text-2xl">
            {isEdit ? `Edit Layanan: ${initialData?.name}` : 'Tambah Layanan Service IT Baru'}
          </CardTitle>
          <CardDescription>
            Layanan yang berstatus aktif akan otomatis muncul pada katalog servis dan formulir pesanan customer.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Terjadi Kesalahan:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Nama Layanan */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Nama Layanan IT *
              </label>
              <input
                type="text"
                placeholder="cth: Service Laptop / Upgrade SSD NVMe / Pembersihan Virus"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* 2. Deskripsi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Deskripsi Lengkap Layanan *
                </label>
                <span className="text-[10px] text-slate-500">Min. 10 karakter</span>
              </div>
              <textarea
                rows={4}
                placeholder="Jelaskan cakupan pengerjaan, jenis perangkat yang didukung, dan keuntungan layanan ini..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* 3 & 4. Tarif & Estimasi Durasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Tarif Estimasi (IDR) *
                </label>
                <input
                  type="number"
                  placeholder="cth: 150000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-mono font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Estimasi Durasi Pengerjaan *
                </label>
                <input
                  type="text"
                  placeholder="cth: 2 - 4 Jam / 1 - 3 Hari Kerja"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            {/* 5. URL Gambar / Icon (Opsional) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                URL Gambar Banner / Icon <span className="text-slate-500 font-normal">(Opsional)</span>
              </label>
              <input
                type="text"
                placeholder="https://... atau path gambar"
                value={formData.image || ''}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* 6. Status Aktif / Nonaktif Toggle */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Status Publikasi Layanan</span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Layanan yang nonaktif tidak akan muncul di katalog publik dan pilihan pemesanan customer.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.isActive ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <Link href="/admin/services">
                <Button variant="secondary" type="button">
                  Batal
                </Button>
              </Link>
              <Button type="submit" isLoading={isLoading} className="shadow-lg shadow-indigo-600/30">
                <Save className="w-4 h-4" />
                <span>{isEdit ? 'Simpan Perubahan' : 'Tambahkan Layanan'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
