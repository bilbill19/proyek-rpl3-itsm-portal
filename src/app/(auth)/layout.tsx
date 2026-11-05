import React from 'react';
import Link from 'next/link';
import { Wrench, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Watermark } from '@/components/Watermark';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors relative">
      {/* Top Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Left Column: Branding / Value Proposition (Desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-50 via-indigo-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 border-r border-slate-200 dark:border-slate-800/80 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-600/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 group inline-flex">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">ITSM PRO</span>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">Enterprise IT Service Platform</p>
            </div>
          </Link>
        </div>

        {/* Middle content */}
        <div className="relative z-10 max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" /> Sistem Layanan IT Terintegrasi
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Perbaikan & Pengelolaan IT Terpercaya dengan Tracking Transparan.
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-200 leading-relaxed">
            Pantau status laptop, PC, dan server Anda dari mana saja. Teknisi berpengalaman, estimasi biaya di awal, dan suku cadang original bergaransi.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'Diagnosa hardware & software transparan',
              'Update progres perbaikan real-time via dashboard',
              'Konsultasi IT cerdas dengan Miko',
              'Garansi perbaikan resmi hingga 90 hari',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="relative z-10 text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} IT Service Management. All rights reserved.
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {children}

          {/* Watermark resmi pengembang (in-flow, di bawah formulir) */}
          <Watermark variant="inline" />
        </div>
      </div>
    </div>
  );
}
