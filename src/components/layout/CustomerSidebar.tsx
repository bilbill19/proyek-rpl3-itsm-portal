'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  MessageSquareHeart,
  User,
  LogOut,
  Headphones,
  Laptop,
  Search,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface CustomerSidebarProps {
  user: {
    name: string;
    email: string;
  };
  /**
   * 'desktop' (default) — tampil utuh pada ≥1024px, tersembunyi di bawahnya.
   * 'mobile'            — instance untuk drawer navigasi < lg (tanpa hidden).
   */
  variant?: 'desktop' | 'mobile';
}

export function CustomerSidebar({ user, variant = 'desktop' }: CustomerSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Pesan Service',
      href: '/dashboard/orders/new',
      icon: PlusCircle,
      highlight: true,
    },
    {
      title: 'Tracking Service',
      href: '/dashboard/tracking',
      icon: Search,
    },
    {
      title: 'Riwayat Service',
      href: '/dashboard/history',
      icon: Clock,
    },
    {
      title: 'Konsultasi AI',
      href: '/dashboard/ai',
      icon: Bot,
      badge: 'Miko',
    },
    {
      title: 'Profile',
      href: '/dashboard/profile',
      icon: User,
    },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={cn(
        'w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col h-screen sticky top-0 transition-colors',
        // Collapse responsif: sidebar desktop hanya pada ≥ lg; < lg navigasi
        // lewat drawer hamburger (lihat DashboardShell).
        variant !== 'mobile' && 'hidden lg:flex'
      )}
    >
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <Laptop className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">ITSM PORTAL</h2>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Pelanggan
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3 py-2">
          Menu Layanan
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150',
                item.highlight && !isActive && 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-600/30',
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : !item.highlight && 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : item.highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400')} />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold border border-purple-200 dark:border-purple-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="pt-6">
          <div className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg dark:shadow-black/25 p-4 text-center">
            <Headphones className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">Butuh Bantuan Cepat?</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-300 mb-3">Hubungi tim CS teknis kami via WhatsApp.</p>
            <a
              href="https://wa.me/62895358051975?text=Halo%2C%20saya%20ingin%20bertanya%20mengenai%20layanan%20ITSM."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors shadow-sm"
            >
              Chat WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-xs text-white">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-500/20 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          {isLoggingOut ? 'Logout...' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
