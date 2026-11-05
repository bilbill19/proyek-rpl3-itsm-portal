'use client';

import React from 'react';
import {
  ShieldCheck,
  Award,
  Zap,
  Users,
  CheckCircle2,
  Clock,
  Laptop,
} from 'lucide-react';

export function TrustSection() {
  const trustPoints = [
    {
      icon: ShieldCheck,
      title: 'Garansi Servis Hingga 90 Hari',
      description: 'Setiap perbaikan hardware maupun penggantian sparepart dilindungi garansi resmi tertulis.',
    },
    {
      icon: Zap,
      title: 'Transparansi Biaya di Awal',
      description: 'Kami memberikan rincian estimasi biaya sebelum pengerjaan. Tidak ada biaya siluman atau biaya tersembunyi.',
    },
    {
      icon: Award,
      title: 'Teknisi Lab Bersertifikasi',
      description: 'Dikerjakan oleh teknisi ahli mikrosolder dan IT hardware berpengalaman lebih dari 8 tahun.',
    },
    {
      icon: Clock,
      title: 'Monitoring Progres Tiket',
      description: 'Pantau tahapan perbaikan perangkat Anda secara real-time langsung melalui dashboard pelanggan.',
    },
  ];

  return (
    <section id="about" className="py-20 bg-slate-100 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800/80">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Heading */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Mengapa Memilih Kami?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Standar Kualitas Tertinggi untuk Perangkat IT Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Kami memadukan keahlian teknisi profesional, peralatan laboratorium mutakhir, dan sistem manajemen tiket terdigitalisasi untuk memberikan pengalaman servis terbaik.
            </p>
          </div>

          {/* Right Column: 4 Grid Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trustPoints.map((tp, idx) => {
              const Icon = tp.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 transition-all space-y-2.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{tp.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{tp.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
