'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Wrench,
  Laptop,
  Upload,
  X,
  MapPin,
  Building2,
  Car,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  DollarSign,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ServiceItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

function NewServiceOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const initialProblem = searchParams.get('problem') || '';
  const initialServiceId = searchParams.get('serviceId') || '';
  const initialDeviceType = searchParams.get('device') || 'Laptop';

  const [formData, setFormData] = useState({
    serviceId: initialServiceId,
    deviceType: initialDeviceType,
    deviceBrand: '',
    problemDescription: initialProblem,
    damageImage: '',
    serviceMethod: 'DROP_OFF' as 'DROP_OFF' | 'ONSITE',
    address: '',
  });

  const [selectedServiceObj, setSelectedServiceObj] = useState<ServiceItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available services from database API
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (res.ok && data.services) {
          setServices(data.services);

          // If initialServiceId was provided, match it
          if (initialServiceId) {
            const match = data.services.find((s: ServiceItem) => s.id === initialServiceId);
            if (match) setSelectedServiceObj(match);
          }
        }
      } catch (err) {
        console.error('Error fetching services:', err);
      } finally {
        setIsLoadingServices(false);
      }
    }
    fetchServices();
  }, [initialServiceId]);

  // Update selected service object when serviceId changes
  const handleServiceChange = (sId: string) => {
    setFormData((prev) => ({ ...prev, serviceId: sId }));
    const found = services.find((s) => s.id === sId) || null;
    setSelectedServiceObj(found);
  };

  // Handle image upload (converts to base64 preview)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      setImageError('Ukuran file maksimal 4MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setImageError('Format file harus berupa gambar (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setImagePreview(base64String);
      setFormData((prev) => ({ ...prev, damageImage: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, damageImage: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side quick checks
    if (formData.problemDescription.trim().length < 10) {
      setError('Deskripsi masalah minimal 10 karakter.');
      return;
    }

    if (formData.serviceMethod === 'ONSITE' && (!formData.address || formData.address.trim().length < 5)) {
      setError('Alamat lengkap wajib diisi jika memilih metode Teknisi Datang ke Lokasi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat pesanan service.');
      }

      // Redirect ke halaman detail pesanan: /dashboard/orders/[id]
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.order?.id) {
        router.push(`/dashboard/orders/${data.order.id}`);
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses pesanan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </Link>

      {/* Main Order Form Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Formulir Pesanan Service IT
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Status Awal: CREATED</span>
          </div>
          <CardTitle className="text-2xl">Buat Pesanan Service Baru</CardTitle>
          <CardDescription>
            Isi formulir berikut dengan lengkap untuk mendapatkan nomor tiket servis dan penjadwalan diagnosa teknisi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Terjadi Kesalahan:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {initialProblem && (
            <div className="mb-6 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-500/30 flex items-center justify-between gap-3 text-xs text-purple-700 dark:text-purple-200">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Formulir telah diisi otomatis berdasarkan hasil konsultasi AI.</span>
              </div>
              <span className="text-[11px] text-purple-700 dark:text-purple-300/70">Miko Assistant</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Pilih Layanan */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                1. Pilih Jenis Layanan IT
              </label>
              <select
                value={formData.serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Pemeriksaan & Diagnosa Umum Terlebih Dahulu (Umum)</option>
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} — Estimasi: {formatCurrency(srv.price)} ({srv.estimatedDuration})
                  </option>
                ))}
              </select>

              {/* Service Info Pill if selected */}
              {selectedServiceObj && (
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/30 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300">{selectedServiceObj.name}</span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">{selectedServiceObj.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 block">Estimasi Tarif:</span>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(selectedServiceObj.price)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 2 & 3. Jenis Perangkat & Brand Perangkat */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  2. Jenis Perangkat
                </label>
                <select
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                >
                  <option value="Laptop">Laptop / Notebook</option>
                  <option value="PC Desktop">PC Desktop / Workstation</option>
                  <option value="MacBook">Apple MacBook / iMac</option>
                  <option value="Printer">Printer / Scanner</option>
                  <option value="Server / NAS">Server / Jaringan / NAS</option>
                  <option value="Lainnya">Perangkat IT Lainnya</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  3. Brand & Model Perangkat
                </label>
                <input
                  type="text"
                  placeholder="cth: Asus ROG Zephyrus G14 / Lenovo ThinkPad T14"
                  value={formData.deviceBrand}
                  onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>
            </div>

            {/* 4. Deskripsi Masalah */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  4. Deskripsi Masalah / Gejala Kerusakan
                </label>
                <span className="text-[10px] text-slate-600 dark:text-slate-400">Min. 10 karakter</span>
              </div>
              <textarea
                rows={4}
                placeholder="Jelaskan kronologi dan gejala kerusakan secara detail (cth: Layar tiba-tiba blank saat dipakai rendering, kipas berbunyi keras, lampu indikator power berkedip 3 kali, suhu sangat panas...)"
                value={formData.problemDescription}
                onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* 5. Upload Foto Kerusakan (Opsional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  5. Upload Foto Kerusakan <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <span className="text-[10px] text-slate-500">Maks. 4MB (JPG, PNG, WebP)</span>
              </div>

              {imagePreview ? (
                <div className="relative inline-block border border-indigo-500/40 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 p-2 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview Kerusakan"
                    className="max-h-48 rounded-xl object-contain"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors"
                    title="Hapus foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500/60 rounded-2xl p-6 text-center transition-colors bg-slate-100 dark:bg-slate-950/40">
                  <input
                    type="file"
                    accept="image/*"
                    id="damage-image-input"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="damage-image-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Klik untuk upload foto fisik / layar perangkat
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Membantu teknisi melihat kondisi fisik kerusakan secara visual
                    </span>
                  </label>
                </div>
              )}
              {imageError && <p className="text-xs text-rose-600 dark:text-rose-400">{imageError}</p>}
            </div>

            {/* 6. Pilihan Metode Service */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                6. Pilihan Metode Service
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opsi 1: Antar Perangkat */}
                <div
                  onClick={() => setFormData({ ...formData, serviceMethod: 'DROP_OFF' })}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    formData.serviceMethod === 'DROP_OFF'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white shadow-lg shadow-indigo-600/15'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        formData.serviceMethod === 'DROP_OFF'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Antar ke Workshop</span>
                        {formData.serviceMethod === 'DROP_OFF' && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Anda membawa perangkat langsung ke workshop kami: Jl. Merdeka No. 45, Jakarta Selatan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Opsi 2: Teknisi Datang ke Lokasi */}
                <div
                  onClick={() => setFormData({ ...formData, serviceMethod: 'ONSITE' })}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    formData.serviceMethod === 'ONSITE'
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white shadow-lg shadow-indigo-600/15'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        formData.serviceMethod === 'ONSITE'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Teknisi Datang ke Lokasi</span>
                        {formData.serviceMethod === 'ONSITE' && (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Teknisi IT kami akan mengunjungi rumah, kantor, atau lokasi Anda untuk perbaikan di tempat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Alamat (Wajib jika Teknisi ke Lokasi) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                7. Alamat Lengkap Penjemputan / Kunjungan{' '}
                {formData.serviceMethod === 'ONSITE' ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">*Wajib Diisi</span>
                ) : (
                  <span className="text-slate-500 font-normal">(Opsional jika antar ke workshop)</span>
                )}
              </label>
              <textarea
                rows={3}
                placeholder={
                  formData.serviceMethod === 'ONSITE'
                    ? 'Masukkan alamat lengkap (Nama Jalan, No. Rumah, RT/RW, Kelurahan, Kecamatan, Kota, & Patokan Lokasi)...'
                    : 'Jl. Alamat Anda (Opsional jika ingin layanan antar-kembali setelah selesai)...'
                }
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required={formData.serviceMethod === 'ONSITE'}
              />
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Nomor tiket (cth: SRV-2026-0001) akan otomatis digenerate setelah submit.</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button variant="secondary" type="button" className="w-full sm:w-auto">
                    Batal
                  </Button>
                </Link>

                <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto whitespace-nowrap">
                  <Wrench className="w-4 h-4" />
                  <span>Kirim Pesanan Service</span>
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewServiceOrderPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-600 dark:text-slate-400 text-xs">Memuat formulir pesanan...</div>}>
      <NewServiceOrderForm />
    </Suspense>
  );
}
