'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, PlusCircle, CheckCircle2, ShieldAlert, Laptop, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ServiceItem } from '@/types';

export default function NewServiceRequestPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [formData, setFormData] = useState({
    serviceId: '',
    deviceType: 'Laptop',
    deviceBrand: '',
    problemDescription: '',
    address: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch('/api/services');
        const data = await res.json();
        if (res.ok && data.services) {
          setServices(data.services);
        }
      } catch (err) {
        console.error('Error fetching services:', err);
      } finally {
        setIsLoadingServices(false);
      }
    }
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat tiket servis');
      }

      router.push('/customer/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/customer/dashboard"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
      </Link>

      <Card>
        <CardHeader>
          <div className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
            <Sparkles className="w-4 h-4" /> Form Pengajuan Servis IT
          </div>
          <CardTitle>Ajukan Perbaikan Perangkat Baru</CardTitle>
          <CardDescription>
            Isi formulir kerusakan perangkat Anda untuk mendapatkan tiket antrian dan jadwal diagnosa teknisi.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Service Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                Pilih Kategori Layanan (Opsional)
              </label>
              <select
                value={formData.serviceId}
                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Pemeriksaan & Diagnosa Terlebih Dahulu (Umum)</option>
                {services.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name} (Estimasi: Rp {Number(srv.price).toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>

            {/* Device Type & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                  Jenis Perangkat
                </label>
                <select
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Laptop">Laptop / Notebook</option>
                  <option value="PC Desktop">PC Desktop / Komputer Rakitan</option>
                  <option value="MacBook">Apple MacBook / iMac</option>
                  <option value="Printer">Printer / Scanner</option>
                  <option value="Server / NAS">Server / Jaringan / NAS</option>
                  <option value="Lainnya">Perangkat IT Lainnya</option>
                </select>
              </div>

              <Input
                label="Merk & Tipe Perangkat"
                placeholder="cth: Asus ROG Zephyrus G14 / Lenovo Legion 5"
                value={formData.deviceBrand}
                onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })}
                required
              />
            </div>

            {/* Problem Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                Deskripsi Kerusakan / Keluhan
              </label>
              <textarea
                rows={4}
                placeholder="Jelaskan secara detail gejala kerusakan (cth: layar tiba-tiba blank saat dipakai rendering, kipas berbunyi keras, suhu mencapai 90C...)"
                value={formData.problemDescription}
                onChange={(e) => setFormData({ ...formData, problemDescription: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            {/* Address */}
            <Input
              label="Alamat Penjemputan / Pengantaran (Opsional)"
              placeholder="Jl. Nama Jalan No. XX, Kelurahan, Kota (Bisa dikosongkan jika antar ke workshop)"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

            <div className="pt-2 flex justify-end gap-3">
              <Link href="/customer/dashboard">
                <Button variant="secondary" type="button">
                  Batal
                </Button>
              </Link>
              <Button type="submit" isLoading={isLoading}>
                <PlusCircle className="w-4 h-4" />
                <span>Kirim Pengajuan Servis</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
