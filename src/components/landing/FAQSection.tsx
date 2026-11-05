'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Bagaimana cara berkonsultasi dengan AI Assistant mengenai kerusakan komputer?',
      a: 'Anda cukup mengklik tombol "Konsultasi AI" — tersedia di halaman utama, dashboard, dan sidebar pelanggan — untuk membuka Miko — ITSM Smart Assistant. Untuk chatbot percakapan cepat di halaman beranda, gunakan tombol mengambang "Tanya Mimo". Kedua AI akan memberikan analisa awal, estimasi biaya, dan rekomendasi langkah perbaikan secara instan.',
    },
    {
      q: 'Berapa lama estimasi waktu pengerjaan servis laptop atau PC?',
      a: 'Layanan fast-track seperti pembersihan debu, repaste thermal paste, install ulang, dan upgrade SSD/RAM selesai dalam 2 - 4 jam. Untuk perbaikan chip-level motherboard atau penggantian komponen khusus membutuhkan waktu 1 - 3 hari kerja.',
    },
    {
      q: 'Apakah ada garansi setelah perbaikan selesai?',
      a: 'Ya, seluruh perbaikan hardware dan penggantian suku cadang di ITSM dilindungi garansi resmi tertulis hingga 90 hari. Jika kendala yang sama muncul kembali selama masa garansi, kami akan memperbaikinya tanpa biaya tambahan.',
    },
    {
      q: 'Bagaimana cara memantau progres pengerjaan perangkat saya?',
      a: 'Setelah mengajukan tiket servis, Anda akan menerima Nomor Tiket unik. Anda dapat masuk ke Dashboard Pelanggan untuk memantau status secara real-time: mulai dari Diterima, Diagnosa, Pengerjaan, hingga Selesai.',
    },
    {
      q: 'Apakah data pribadi saya aman saat komputer diservis?',
      a: 'Kami menjunjung tinggi privasi dan keamanan data klien. Teknisi kami bekerja dengan SOP ketat tanpa membuka data pribadi Anda. Kami juga menyediakan opsi backup data sebelum pengerjaan dilakukan.',
    },
  ];

  return (
    <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800/80">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" /> Pertanyaan Umum
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Pertanyaan yang sering diajukan seputar layanan, garansi, dan sistem perbaikan komputer kami.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
