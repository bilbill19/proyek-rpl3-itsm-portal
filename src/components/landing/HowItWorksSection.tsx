'use client';

import React from 'react';
import {
  MessageSquare,
  FileCheck2,
  Wrench,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Bot,
  ShieldCheck,
} from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Konsultasi',
      subtitle: 'Diagnosa Gejala Awal',
      description:
        'Jelaskan kerusakan perangkat Anda atau gunakan AI Diagnostic untuk mendapatkan analisa awal estimasi penyebab dan solusi.',
      icon: Bot,
      color: 'from-purple-500 to-indigo-600',
      badge: '24/7 AI Ready',
    },
    {
      number: '02',
      title: 'Buat Pesanan',
      subtitle: 'Dapatkan Tiket Servis',
      description:
        'Pilih layanan yang dibutuhkan, isi rincian perangkat, dan dapatkan nomor tiket tracking unik untuk memantau status secara online.',
      icon: FileCheck2,
      color: 'from-indigo-500 to-blue-600',
      badge: 'Order Instan',
    },
    {
      number: '03',
      title: 'Proses Service',
      subtitle: 'Pengerjaan Profesional',
      description:
        'Perangkat ditangani di laboratorium dengan peralatan mikroskopis, standar antistatis, dan komponen original oleh teknisi bersertifikat.',
      icon: Wrench,
      color: 'from-blue-500 to-teal-600',
      badge: 'Teknisi Lab Ahli',
    },
    {
      number: '04',
      title: 'Selesai',
      subtitle: 'Quality Control & Garansi',
      description:
        'Uji performa menyeluruh (stress test) sebelum perangkat diambil atau diantar. Dilengkapi garansi servis resmi hingga 90 hari.',
      icon: CheckCircle,
      color: 'from-teal-500 to-emerald-600',
      badge: 'Garansi 90 Hari',
    },
  ];

  return (
    <section id="workflow" className="py-20 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
      {/* Background Subtle Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#312e81_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Alur Transparan & Terstruktur
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Bagaimana Cara Kami Memperbaiki Komputer Anda?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Hanya butuh 4 langkah mudah dari konsultasi awal hingga perangkat Anda kembali normal dengan performa optimal.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300 group shadow-sm dark:shadow-lg"
              >
                {/* Step Number Watermark & Icon */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${step.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black text-slate-300 dark:text-slate-700 group-hover:text-indigo-400/50 dark:group-hover:text-indigo-400/50 transition-colors font-mono">
                      {step.number}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded-full inline-block mb-2">
                    {step.badge}
                  </span>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                    {step.title}
                  </h3>
                  <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
                    {step.subtitle}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Bottom connector indicator on desktop */}
                <div className="pt-6 mt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tahap {idx + 1} dari 4</span>
                  {idx < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-600 hidden lg:block" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
