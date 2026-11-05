import React from 'react';
import { DEVELOPER_IDENTITY } from '@/lib/developer';

interface WatermarkProps {
  /** Kelas Tailwind tambahan (opsional) — mis. penyesuaian margin di footer. */
  className?: string;
  /** Tampilan: 'bar' = baris tipis di bawah konten (layout dashboard), 'inline' = teks kecil (footer). */
  variant?: 'bar' | 'inline';
}

/**
 * Watermark resmi pengembang — "Developed by Bilbina Maharani".
 *
 * Desain: elegan, minimalis, profesional; teks kecil tetap terbaca, warna
 * selaras tema (slate), mendukung Light & Dark Mode serta breakpoint mobile.
 * Dirender IN-FLOW (bukan fixed) sehingga TIDAK PERNAH menutupi konten,
 * sidebar, navbar, tombol, maupun floating chatbot.
 *
 * Komponen reusable — dipakai pada footer halaman publik dan baris bawah
 * layout dashboard (admin/customer) tanpa menyalin kode.
 */
export function Watermark({ className = '', variant = 'bar' }: WatermarkProps) {
  const base =
    variant === 'bar'
      ? 'w-full shrink-0 py-2 px-4 text-center'
      : 'w-full text-center';

  return (
    <div
      className={`${base} text-[10px] sm:text-[11px] font-medium tracking-wide select-none text-slate-400 dark:text-slate-500 ${className}`}
      aria-hidden="true"
    >
      Developed by{' '}
      <span className="font-semibold text-slate-500 dark:text-slate-400">
        {DEVELOPER_IDENTITY.name}
      </span>
    </div>
  );
}

export default Watermark;
