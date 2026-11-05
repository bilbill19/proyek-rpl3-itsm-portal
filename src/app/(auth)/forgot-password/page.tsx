'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, ArrowRight, ShieldAlert, CheckCircle2, KeyRound, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setDevResetLink(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses permintaan reset kata sandi.');
      }

      setSuccessMessage(data.message || 'Instruksi pemulihan telah dikirim ke email Anda.');
      if (data.resetLink) {
        setDevResetLink(data.resetLink);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Halaman Login
      </Link>

      {/* Header */}
      <div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Lupa Kata Sandi?
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pemulihan melalui email belum tersedia. Hubungi administrator untuk bantuan akun.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-400">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification */}
      {successMessage ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Permintaan Reset Terkirim
            </div>
            <p className="leading-relaxed text-slate-300">
              {successMessage} Tautan reset berlaku selama <strong>15 menit</strong>.
            </p>
          </div>

          {/* Dev Demo Link for Instant Testing */}
          {devResetLink && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">
                Mode Demo / Pengujian Lokal:
              </span>
              <p className="text-xs text-slate-300">
                Klik tombol di bawah ini untuk langsung menuju form ubah kata sandi:
              </p>
              <Link
                href={devResetLink}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-600/30"
              >
                <span>Buka Form Reset Password</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          <div className="pt-2">
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                <span>Kembali ke Halaman Login</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Alamat Email Terdaftar"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" className="w-full" size="md" isLoading={isLoading}>
            <span>Kirim Tautan Reset</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>
      )}

      {/* Footer link to register */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800/80">
        Ingat kata sandi Anda?{' '}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold underline underline-offset-4">
          Login kembali
        </Link>
      </div>
    </div>
  );
}
