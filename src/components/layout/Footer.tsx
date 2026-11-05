import Link from 'next/link';
import { Wrench, ShieldCheck, Clock, Phone, MapPin, Mail } from 'lucide-react';
import { Watermark } from '@/components/Watermark';

export function Footer() {
  return (
    <footer className="w-full bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 mt-auto text-slate-600 dark:text-slate-400 text-xs transition-colors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">ITSM PRO</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
              Penyedia solusi perbaikan komputer, laptop, dan infrastruktur IT profesional untuk personal dan enterprise.
            </p>
          </div>

          {/* Col 2: Fast Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Layanan Populer</h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>Repaste & Deep Cleaning Laptop</li>
              <li>Perbaikan Motherboard & IC Power</li>
              <li>Ganti Layar LCD & Keyboard</li>
              <li>Instalasi OS & Software IT</li>
              <li>Recovery Data & Upgrade SSD</li>
            </ul>
          </div>

          {/* Col 3: Keunggulan */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Keunggulan Layanan</h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Garansi servis hingga 90 hari
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Tracking progres tiket real-time
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Komponen original terpercaya
              </li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 uppercase tracking-wider">Hubungi Workshop</h4>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> Workshop: Jl. Merdeka No. 45, Jakarta Selatan
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <a
                  href="https://wa.me/62895358051975?text=Halo%2C%20saya%20ingin%20bertanya%20mengenai%20layanan%20ITSM."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  Hotline / WhatsApp: 0895358051975
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> support@itservice.com
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-900/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} IT Service Management (ITSM). All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-slate-700 dark:hover:text-slate-400">Privasi</Link>
            <Link href="/terms" className="hover:text-slate-700 dark:hover:text-slate-400">Syarat & Ketentuan</Link>
            <Link href="/contact" className="hover:text-slate-700 dark:hover:text-slate-400">Kontak</Link>
          </div>
        </div>

        {/* Watermark resmi pengembang (reusable, in-flow — tidak menutupi konten) */}
        <Watermark variant="inline" className="mt-5" />
      </div>
    </footer>
  );
}
