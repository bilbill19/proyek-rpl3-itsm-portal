'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk. Periksa email dan password Anda.');
      }

      // Berhasil login -> redirect sesuai role atau callbackUrl
      if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push(data.redirectTo || '/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat mencoba masuk.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick helper to fill demo credentials
  const fillDemoAccount = (role: 'ADMIN' | 'CUSTOMER') => {
    if (role === 'ADMIN') {
      setFormData({
        email: 'admin@itservice.com',
        password: 'Password123!',
      });
    } else {
      setFormData({
        email: 'customer@itservice.com',
        password: 'Password123!',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Masuk ke Akun
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Gunakan kredensial Anda untuk mengakses portal manajemen atau pelanggan.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Alamat Email"
          type="email"
          placeholder="nama@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
              Kata Sandi
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors font-medium"
            >
              Lupa sandi?
            </Link>
          </div>
          <Input
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
        </div>

        <Button type="submit" className="w-full" size="md" isLoading={isLoading}>
          <span>Login Sekarang</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>

      {/* Footer link to register */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        Belum memiliki akun pelanggan?{' '}
        <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold underline-offset-4">
          Daftar akun sekarang
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-400 text-xs">Memuat form login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
