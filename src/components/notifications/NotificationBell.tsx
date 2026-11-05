'use client';

/**
 * Lonceng Notification Center (P4) — header portal pelanggan.
 *
 * - Badge jumlah belum-dibaca; panel riwayat (terbaru dulu) dengan waktu,
 *   status baca/tidak, aksi "Tandai semua dibaca", klik item → detail pesanan.
 * - Polling ringan: 30 detik + refresh saat window kembali fokus; hanya jalan
 *   saat tab terlihat (visibilityState) agar tidak membebani server.
 * - Isolasi di server (filter userId sesi) — komponen ini hanya menampilkan
 *   hasil endpoint milik sesi sendiri.
 * - Responsif + konsisten Light/Dark.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, CheckCheck, Package, RefreshCw } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface NotifOrder {
  id: string;
  ticketNumber: string;
  status: string;
}

interface NotifItem {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  order: NotifOrder | null;
}

const POLL_MS = 30_000;

export function NotificationBell() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) {
        setError(res.status === 401 ? 'Sesi berakhir — silakan login ulang.' : 'Gagal memuat notifikasi.');
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnread(typeof data.unreadCount === 'number' ? data.unreadCount : 0);
      setLoaded(true);
      setError(null);
    } catch {
      // jaringan putus sementara → biarkan tampilan lama, coba lagi pada tick berikutnya
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);
    const onFocus = () => void load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  // Tutup panel: klik di luar / tombol Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markRead = async (item: NotifItem) => {
    if (item.isRead) return;
    // Optimistik (UI) lalu sinkronkan dengan server
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      const res = await fetch(`/api/notifications/${item.id}`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && typeof data.unreadCount === 'number') setUnread(data.unreadCount);
      }
    } catch {
      /* polling berikutnya menyelaraskan */
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch {
      /* polling berikutnya menyelaraskan */
    }
  };

  const onItemClick = (item: NotifItem) => {
    void markRead(item);
    setOpen(false);
    if (item.order?.id) router.push(`/dashboard/orders/${item.order.id}`);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={open ? 'Tutup notifikasi' : `Buka notifikasi${unread > 0 ? ` (${unread} belum dibaca)` : ''}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative w-9 h-9 rounded-xl border flex items-center justify-center transition-colors',
          'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
          'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
        )}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slate-100 dark:border-slate-950"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Daftar notifikasi"
          className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[95vw] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl shadow-slate-900/10 dark:shadow-black/40 z-50 overflow-hidden"
        >
          {/* Header panel */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Notifikasi</span>
              {unread > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  {unread} baru
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-40 disabled:no-underline"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Tandai semua dibaca
            </button>
          </div>

          {/* Daftar */}
          <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
            {!loaded && !error && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memuat notifikasi…
              </div>
            )}

            {error && (
              <div className="px-4 py-6 text-center text-xs text-red-600 dark:text-red-400">{error}</div>
            )}

            {loaded && !error && items.length === 0 && (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                  <BellOff className="w-5 h-5" />
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada notifikasi</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Update status pesanan Anda akan muncul di sini.
                </p>
              </div>
            )}

            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onItemClick(n)}
                className={cn(
                  'w-full text-left flex gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/70 transition-colors last:border-b-0',
                  'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                  !n.isRead && 'bg-indigo-50/60 dark:bg-indigo-950/25'
                )}
              >
                <span
                  className={cn(
                    'shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5',
                    n.isRead
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
                  )}
                >
                  <Package className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'text-xs text-slate-900 dark:text-white',
                        !n.isRead ? 'font-bold' : 'font-semibold'
                      )}
                    >
                      {n.title}
                    </span>
                    {!n.isRead && <span className="shrink-0 w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                  </span>
                  <span className="block text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {n.body}
                  </span>
                  {n.order?.ticketNumber && (
                    <span className="block text-[10px] text-slate-500 dark:text-slate-500 font-semibold mt-1">
                      {n.order.ticketNumber}
                    </span>
                  )}
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {formatDate(n.createdAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-500 dark:text-slate-400 text-center">
            Klik notifikasi untuk membuka detail pesanan
          </div>
        </div>
      )}
    </div>
  );
}
