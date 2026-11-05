'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { openHomeChatbot } from '@/components/chatbot/HomeChatbot';

export function AIAssistantSection() {
  return (
    <section id="ai-assistant" className="py-20 bg-gradient-to-b from-white via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border-t border-slate-200 dark:border-slate-800/80 relative overflow-hidden">
      {/* Background Lighting Effects */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[450px] h-[450px] bg-indigo-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: AI Value Proposition & Features */}
          <div className="lg:col-span-8 lg:col-start-3 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Teknologi Diagnosa Cerdas 24/7</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.2]">
              Konsultasi Masalah IT <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 dark:from-purple-400 dark:via-indigo-300 dark:to-pink-400">
                Didukung Mimo — IT Service Assistant
              </span>
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Bingung apa yang rusak pada komputer Anda? Konsultasikan gejala kerusakan secara real-time dengan Mimo, asisten virtual kami. Dapatkan analisa akar masalah, estimasi biaya, dan rekomendasi perbaikan sebelum datang ke workshop.
            </p>

            {/* AI Benefits */}
            <div className="space-y-3 pt-2 text-left">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Diagnosa Instan Tanpa Menunggu</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Tanyakan keluhan perangkat kapan saja, sistem AI menganalisa ribuan kasus perbaikan IT secara presisi.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Transparansi Biaya & Estimasi Part</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Ketahui perkiraan tarif layanan dan kebutuhan sparepart sebelum memutuskan melakukan pemesanan servis.</p>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <Link
                href="/register"
                onClick={(event) => {
                  event.preventDefault();
                  openHomeChatbot();
                }}
              >
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-xl shadow-purple-600/25">
                  <Bot className="w-4 h-4" />
                  <span>Coba Mimo</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
