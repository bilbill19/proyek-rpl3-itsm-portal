import Link from 'next/link';
import { Wrench, Shield, LogIn, User, Sparkles } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export async function Navbar() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/85 dark:bg-slate-950/80 backdrop-blur-xl transition-colors">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              ITSM <span className="text-indigo-600 dark:text-indigo-400 font-medium text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">PRO</span>
            </span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1 font-medium tracking-wide">IT Service Management</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/#services" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Layanan IT
          </Link>
          <Link href="/#workflow" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Alur Servis
          </Link>
          <Link href="/track" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors flex items-center gap-1.5 text-indigo-600 dark:text-indigo-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tracking Service
          </Link>
          <Link href="/#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Auth / Dashboard CTA & Theme Toggle */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {session ? (
            <div className="flex items-center gap-3">
              <Link
                href={session.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all duration-200"
              >
                {session.role === 'ADMIN' ? (
                  <>
                    <Shield className="w-4 h-4 text-indigo-200" />
                    Admin Panel
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 text-indigo-200" />
                    Dashboard Saya
                  </>
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Daftar Servis
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
