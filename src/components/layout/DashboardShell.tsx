'use client';

/**
 * DashboardShell — kerangka layout dashboard (Admin & Customer) yang responsif:
 *  - ≥1024px : sidebar desktop tampil utuh (tampilan lama, TIDAK berubah).
 *  - <1024px : sidebar disembunyikan; konten memakai lebar layar penuh, dan
 *              navigasi diakses lewat tombol hamburger di topbar (drawer).
 *
 * Scope: perbaikan responsif mobile (audit Tahap 2 #1 & #2) tanpa menyentuh
 * perilaku desktop, database, AI, maupun WhatsApp.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface DashboardShellContextValue {
  openSidebar: () => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue>({
  openSidebar: () => {},
});

/** Hook untuk elemen header yang perlu membuka drawer navigasi mobile. */
export function useDashboardShell() {
  return useContext(DashboardShellContext);
}

/**
 * Tombol hamburger di topbar — hanya tampil pada viewport < lg
 * (pada ≥ lg sidebar desktop tampil dan tombol ini tidak ada).
 */
export function SidebarMenuButton() {
  const { openSidebar } = useDashboardShell();

  return (
    <button
      type="button"
      onClick={openSidebar}
      aria-label="Buka menu navigasi"
      className="lg:hidden shrink-0 p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800/70 transition-colors"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

interface DashboardShellProps {
  /** Instance sidebar mode desktop (komponennya sendiri memakai `hidden lg:flex`). */
  sidebar: React.ReactNode;
  /** Instance sidebar mode mobile untuk drawer (< lg) — tanpa class hidden. */
  drawerSidebar: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({ sidebar, drawerSidebar, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Tutup drawer otomatis setiap pindah halaman — navigasi tetap berfungsi.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Tombol Escape menutup drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  return (
    <DashboardShellContext.Provider value={{ openSidebar: () => setMobileOpen(true) }}>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
        {/* Sidebar desktop (tersembunyi otomatis di < lg oleh kelas pada komponennya) */}
        {sidebar}

        {/* Main Content Area — min-w-0 agar memakai lebar layar tersisa */}
        <div className="flex-1 flex flex-col min-w-0">{children}</div>

        {/* Drawer navigasi mobile — hanya dirender saat dibuka, hanya < lg */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-[60]"
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
          >
            {/* Backdrop: klik untuk menutup */}
            <div
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel drawer */}
            <div className="absolute inset-y-0 left-0 w-64 max-w-[85vw] flex flex-col shadow-2xl">
              {drawerSidebar}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu navigasi"
                className="absolute top-4 right-3 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShellContext.Provider>
  );
}
