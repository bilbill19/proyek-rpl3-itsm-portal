'use client';

import React from 'react';
import Link from 'next/link';
import {
  Wrench,
  Bot,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function CTASection() {
  return (
    <section className="py-20 bg-white dark:bg-slate-950 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-indigo-600/20 via-purple-600/20 to-pink-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="rounded-3xl bg-gradient-to-b from-white via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 p-8 sm:p-12 md:p-16 text-center space-y-8 shadow-lg dark:shadow-2xl backdrop-blur-xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            <span>Garansi Servis Resmi Hingga 90 Hari</span>
          </div>

          {/* Heading */}
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Perangkat IT Anda Rusak atau <br />
              <span className="gradient-text">Performa Menurun Drastis?</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
              Jangan biarkan pekerjaan dan produktivitas Anda terhambat. Ajukan tiket servis sekarang atau dapatkan analisa instan bersama Miko — ITSM Smart Assistant kami.
            </p>
          </div>

          {/* CTA Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto shadow-xl shadow-indigo-600/30">
                <Wrench className="w-4 h-4" />
                <span>Pesan Service Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            {/* Tombol Konsultasi AI -> Miko (dashboard) */}
            <Link href="/dashboard/ai" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              >
                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Konsultasi AI</span>
              </Button>
            </Link>
          </div>

          {/* Guarantee Badges Footer */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-y-2 gap-x-8 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Gratis Konsultasi & Diagnosa Awal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Suku Cadang 100% Original</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tracking Real-Time 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
