'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Users,
  UserCog,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  ShieldAlert,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AdminSidebarProps {
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

export function AdminSidebar({ user, variant = 'desktop' }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const menuItems = [
    {
      title: 'Dashboard Overview',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Antrian Servis / Tiket',
      href: '/admin/orders',
      icon: ClipboardList,
      badge: 'Aktif',
    },
    {
      title: 'Katalog Layanan',
      href: '/admin/services',
      icon: Wrench,
    },
    {
      title: 'Data Pelanggan',
      href: '/admin/customers',
      icon: Users,
    },
    {
      title: 'Manajemen User',
      href: '/admin/users',
      icon: UserCog,
    },
    {
      title: 'Inventaris & Sparepart',
      href: '/admin/inventory',
      icon: HardDrive,
    },
    {
      title: 'Laporan & Finansial',
      href: '/admin/reports',
      icon: BarChart3,
    },
    {
      title: 'Pengaturan Sistem',
      href: '/admin/settings',
      icon: Settings,
    },
    {
      title: 'Miko Assistant',
      href: '/admin/ai',
      icon: Sparkles,
      badge: 'Baru',
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
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">ITSM ADMIN</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
            Control Center
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 px-3 py-2">
          Manajemen Utama
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
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-4 h-4', isActive ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400')} />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/40">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
            {user.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 truncate">{user.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          {isLoggingOut ? 'Logout...' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
