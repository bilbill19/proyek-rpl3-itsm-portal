import React from 'react';
import { requireCustomer } from '@/lib/rbac';
import { CustomerSidebar } from '@/components/layout/CustomerSidebar';
import { DashboardShell, SidebarMenuButton } from '@/components/layout/DashboardShell';
import { MikoFloating } from '@/components/ai/MikoFloating';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Watermark } from '@/components/Watermark';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomer();

  return (
    <DashboardShell
      sidebar={<CustomerSidebar user={session} />}
      drawerSidebar={<CustomerSidebar user={session} variant="mobile" />}
    >
      {/* Top bar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-slate-100/85 dark:bg-slate-950/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-40 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarMenuButton />
          {/* Teks status disembunyikan di < sm agar header tidak overflow pada layar 375–390px */}
          <span className="hidden sm:inline text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
            Portal Layanan & Garansi Pelanggan
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <ThemeToggle />
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900 dark:text-white">{session.name}</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Customer Portal</p>
          </div>
        </div>
      </header>

      {/* Dynamic page content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>

      {/* Watermark resmi pengembang (baris bawah, in-flow) */}
      <Watermark />

      {/* Bubble Miko mengambang (kanan bawah) — API & riwayat sama dengan halaman AI */}
      <MikoFloating mode="customer" />
    </DashboardShell>
  );
}
