'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Wrench,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-indigo-600/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[350px] h-[350px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Col: Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold shadow-inner">
              <Sparkles className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              <span>Pusat Layanan Service Komputer & IT Profesional</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Solusi Service Komputer & IT <br />
              <span className="gradient-text">Cepat, Transparan & Bergaransi</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Platform perbaikan komputer, laptop, MacBook, dan infrastruktur jaringan terpercaya. Dapatkan estimasi diagnosa instan dengan AI, transparansi biaya, dan monitoring progres tiket servis secara real-time.
            </p>

            {/* Action Buttons: Konsultasi AI & Pesan Service */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              {/* Tombol Pesan Service */}
              <Link href="/register" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto shadow-xl shadow-indigo-600/30 group">
                  <Wrench className="w-4 h-4" />
                  <span>Pesan Service</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {/* Tombol Konsultasi AI -> Miko (dashboard) */}
              <Link href="/dashboard/ai" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto bg-white dark:bg-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/60 dark:to-indigo-950/60 border border-purple-300 dark:border-purple-500/30 hover:border-purple-400 dark:hover:border-purple-400/60 text-purple-700 dark:text-purple-200 hover:text-purple-900 dark:hover:text-white"
                >
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Konsultasi AI</span>
                </Button>
              </Link>
            </div>

            {/* Key Value Props Checklist */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Garansi Resmi 90 Hari</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Selesai 2 - 4 Jam (Fast Track)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Teknisi Lab Bersertifikasi</span>
              </div>
            </div>
          </div>

          {/* Right Col: High-Tech Interactive Preview Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl bg-gradient-to-br from-white via-white to-indigo-50 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-indigo-950/40 border border-slate-200 dark:border-slate-800 p-6 shadow-lg dark:shadow-2xl backdrop-blur-xl space-y-5">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ITSM Diagnostic Engine v2.4
                </span>
              </div>

              {/* Interactive Status Card Item 1 */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    ITSM-202608-0001
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Sedang Dikerjakan
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">Asus ROG Zephyrus G14</div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">Deep Clean & Repaste</div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-3/4 rounded-full" />
                </div>
              </div>

              {/* AI Quick Diagnostic Snippet Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-slate-950 border border-purple-200 dark:border-purple-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Miko — ITSM Smart Assistant</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                  &ldquo;Gejala laptop overhead dan fan berputar kencang terdeteksi. Rekomendasi: Repaste thermal compound Noctua NT-H1 & pembersihan debu heatsink.&rdquo;
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-purple-200 dark:border-purple-500/20 text-[10px]">
                  <span className="text-slate-500 dark:text-slate-400">Tingkat Akurasi Diagnosa:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">98.5% Akurat</span>
                </div>
              </div>

              {/* Quick Trust Highlights Footer */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40">
                  <div className="text-base font-black text-slate-900 dark:text-white">5.000+</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Unit Berhasil Diservis</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40">
                  <div className="text-base font-black text-emerald-600 dark:text-emerald-400">4.9 / 5.0</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Rating Kepuasan Klien</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
