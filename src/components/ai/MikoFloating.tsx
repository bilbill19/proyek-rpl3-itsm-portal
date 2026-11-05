'use client';

/**
 * MikoFloating — tombol bubble Miko mengambang (kanan bawah) untuk dashboard
 * Admin & Customer.
 *
 * PRINSIP (revisi dosen):
 *   - Menggunakan API, pipeline, riwayat, dan kontrol akses Miko yang SAMA
 *     dengan halaman /admin/ai & /dashboard/ai:
 *       GET  /api/ai/conversations        → daftar riwayat milik sesi login
 *       GET  /api/ai/conversations/[id]   → pesan lengkap (diambil sendiri
 *                                           oleh MikoChat saat percakapan dibuka)
 *       POST /api/ai/conversations[...]   → kirim pesan (pipeline bersama)
 *     TIDAK ada pipeline chatbot / penyimpanan percakapan baru.
 *   - Tidak pernah tampil di halaman chat Miko utama (/admin/ai, /dashboard/ai)
 *     → tidak pernah ada dua bubble/instance Miko di layar yang sama.
 *   - Mimo tetap hanya di halaman Public (komponen ini hanya dipasang di
 *     layout dashboard) → tidak ada bubble ganda antara Mimo & Miko.
 *   - Responsif: panel melebar maksimal selebar layar (375/390px aman),
 *     tema mengikuti Light/Dark Mode global (kelas dark:).
 */

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, X, History } from 'lucide-react';
import {
  MikoChat,
  type ConversationItem,
  type MikoChatMode,
} from '@/components/ai/MikoChat';
import { MIKO } from '@/lib/ai/branding';

interface MikoFloatingProps {
  mode: MikoChatMode;
}

export function MikoFloating({ mode }: MikoFloatingProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // null = belum dimuat (saat pertama dibuka)
  const [conversations, setConversations] = useState<ConversationItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Sembunyikan bubble di halaman chat Miko utama agar TIDAK ada dua
  // instance Miko/bubble di layar yang sama.
  const onMikoPage = pathname === '/admin/ai' || pathname === '/dashboard/ai';

  // Ambil riwayat via API yang sama (kontrol akses: sesi login per role)
  // hanya saat bubble pertama kali dibuka (lazy — tidak membebani tiap halaman).
  useEffect(() => {
    if (!open || conversations !== null) return;
    let alive = true;

    (async () => {
      try {
        const res = await fetch('/api/ai/conversations');
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok && Array.isArray(data.conversations)) {
          // Daftar untuk sidebar riwayat. Pesan sengaja dikosongkan — MikoChat
          // mengambil pesan lengkapnya sendiri lewat GET /api/ai/conversations/[id]
          // (endpoint yang sama dengan halaman penuh).
          setConversations(
            data.conversations.map(
              (c: {
                id: string;
                title: string;
                createdAt: string;
                updatedAt: string;
                _count?: { messages: number };
              }) => ({
                id: c.id,
                title: c.title,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
                _count: c._count,
                messages: [],
              })
            )
          );
          setLoadError(false);
        } else {
          setConversations([]);
          setLoadError(true);
        }
      } catch {
        if (!alive) return;
        setConversations([]);
        setLoadError(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, conversations]);

  if (onMikoPage) return null;

  return (
    <>
      {/* Tombol bubble */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Tutup chat Miko' : 'Buka chat Miko'}
        aria-expanded={open}
        className="fixed bottom-4 right-4 z-[55] h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center border border-white/20"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
      </button>

      {/* Panel percakapan */}
      {open && (
        <div
          role="dialog"
          aria-label="Chat Miko"
          className="fixed bottom-20 right-4 z-[55] w-[calc(100vw-2rem)] max-w-[430px] h-[70vh] max-h-[620px] min-h-[360px] flex flex-col rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl"
        >
          {/* Header panel */}
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">{MIKO.label}</p>
                <p className="text-[10px] text-white/80 truncate">
                  {mode === 'admin'
                    ? 'Asisten Operasional Administrator'
                    : 'Konsultasi Pelanggan 24/7'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup panel Miko"
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body: komponen MikoChat yang sama dengan halaman utama */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {conversations === null ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                <History className="w-5 h-5 animate-pulse" />
                <p className="text-xs font-semibold">Memuat riwayat Miko…</p>
              </div>
            ) : (
              <div className="h-full p-3 overflow-hidden">
                <MikoChat
                  mode={mode}
                  initialConversations={conversations}
                  heightClass="h-full"
                  embedded
                />
                {loadError && (
                  <p className="sr-only" role="status">
                    Riwayat gagal dimuat — pesan baru tetap dapat dikirim.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
