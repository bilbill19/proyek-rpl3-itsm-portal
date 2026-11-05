'use client';

/**
 * Riwayat pengiriman WhatsApp (P7) — panel admin, read-only.
 *
 * Menampilkan mode (SIMULASI/LIVE), status, waktu, jumlah percobaan, dan pesan
 * error tersanitasi. Nomor ditampilkan sebagian (masked). TIDAK PERNAH ada
 * token/kredensial di tampilan maupun respons (kolom tidak ada di tabel).
 */
import React, { useEffect, useState } from 'react';
import { History, MessageCircle, RefreshCw } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

interface Delivery {
  id: string;
  ticketNumber: string | null;
  customerName: string;
  toPhoneMasked: string;
  templateName: string;
  mode: string; // simulation | live
  // simulated | sent (diterima gateway) | failed — 'Terkirim ke HP' TIDAK
  // pernah diklaim tanpa bukti receipt dari provider.
  status: string;
  attempts: number;
  error: string | null;
  providerMessageId: string | null;
  createdAt: string;
}

/** Baris antrean outbox berjalan — METADATA saja (tanpa payload/nomor). */
interface OutboxQueueRow {
  id: string;
  eventType: string;
  status: string; // pending | processing
  attempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  ticketNumber: string | null;
  orderStatus: string | null;
  createdAt: string;
}

interface OutboxInfo {
  /** Hitungan NYATA per status: pending | processing | done | failed. */
  byStatus: Record<string, number>;
  queue: OutboxQueueRow[];
}

/** Badge status pengiriman — label jujur; nilai tak dikenal tampil apa adanya. */
const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  sent: {
    // JUJUR: status 'sent' = diterima API/gateway (ada providerMessageId),
    // BUKAN bukti pesan masuk ke HP customer — verifikasi final via HP penerima
    // (Fonnte tak punya receipt; Meta receipt butuh webhook delivery).
    label: 'Diterima gateway',
    cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
  },
  simulated: {
    label: 'Simulasi (tak terkirim)',
    cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  },
  pending: {
    label: 'Antre (pending)',
    cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',
  },
  processing: {
    label: 'Diproses',
    cls: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800',
  },
  failed: {
    label: 'Gagal',
    cls: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',
  },
};

/** Badge hitungan outbox (strip ringkas). */
const OUTBOX_BADGE_CLS: Record<string, string> = {
  pending: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800',
  processing: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-800',
  done: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
  failed: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800',
};

export function WhatsAppDeliveryHistory() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [outbox, setOutbox] = useState<OutboxInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/whatsapp/deliveries?take=25', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Gagal memuat riwayat.');
      }
      const data = await res.json();
      setItems(Array.isArray(data.deliveries) ? data.deliveries : []);
      setOutbox(
        data.outbox && typeof data.outbox === 'object'
          ? {
              byStatus: data.outbox.byStatus || {},
              queue: Array.isArray(data.outbox.queue) ? data.outbox.queue : [],
            }
          : { byStatus: {}, queue: [] }
      );
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat riwayat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Riwayat WhatsApp (Simulasi &amp; Live)</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            Tanpa secret
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Muat ulang
        </button>
      </div>

      {/* Antrean Outbox — sumber status `pending` yang sesungguhnya.
          Semua angka diambil langsung dari DB (0 = memang tidak ada antrean). */}
      {outbox && (
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mr-1">
              Antrean Outbox
            </span>
            {(['pending', 'processing', 'done', 'failed'] as const).map((k) => {
              const count = outbox.byStatus?.[k] ?? 0;
              return (
                <span
                  key={k}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                    OUTBOX_BADGE_CLS[k]
                  )}
                >
                  {k}
                  <span className="font-mono">{count}</span>
                </span>
              );
            })}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
              — antrean pesan sebelum menjadi baris riwayat (0 = tidak ada antrean)
            </span>
          </div>
          {outbox.queue.length > 0 && (
            <ul className="mt-2 space-y-1">
              {outbox.queue.map((q) => (
                <li
                  key={q.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 dark:text-slate-400"
                >
                  <span className="font-mono font-semibold">{q.ticketNumber || '(tanpa tiket)'}</span>
                  <span
                    className={cn(
                      'px-1.5 py-px rounded-full border text-[9px] font-bold',
                      OUTBOX_BADGE_CLS[q.status] || OUTBOX_BADGE_CLS.pending
                    )}
                  >
                    {q.status}
                  </span>
                  <span>percobaan {q.attempts}</span>
                  <span className="whitespace-nowrap">ulang {formatDate(q.nextAttemptAt)}</span>
                  {q.lastError && (
                    <span className="text-red-600 dark:text-red-400 truncate max-w-[320px]">{q.lastError}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {outbox.queue.length === 0 && (
            <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              Tidak ada baris menunggu — semua event sudah diproses (done/failed).
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="px-5 py-2.5 font-semibold">Waktu</th>
              <th className="px-3 py-2.5 font-semibold">Tiket</th>
              <th className="px-3 py-2.5 font-semibold">Pelanggan</th>
              <th className="px-3 py-2.5 font-semibold">Penerima</th>
              <th className="px-3 py-2.5 font-semibold">Mode</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Coba</th>
              <th className="px-3 py-2.5 font-semibold">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-2" /> Memuat riwayat…
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-red-600 dark:text-red-400">
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center">
                  <MessageCircle className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="mt-2 text-slate-600 dark:text-slate-400 font-semibold">Belum ada riwayat</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                    Ubah status pesanan (admin) untuk memicu preview mode SIMULASI.
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              items.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-slate-100 dark:border-slate-800/70 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatDate(d.createdAt)}
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {d.ticketNumber || '-'}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{d.customerName}</td>
                  <td className="px-3 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {d.toPhoneMasked}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap',
                        d.mode === 'simulation'
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                          : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      )}
                    >
                      {d.mode === 'simulation' ? 'SIMULASI' : 'LIVE'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {(() => {
                      // Nilai tak dikenal TIDAK dilabeli "Gagal" — tampil apa
                      // adanya (jujur terhadap data, bukan menebak).
                      const badge = STATUS_BADGES[d.status] || {
                        label: d.status,
                        cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700',
                      };
                      return (
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap',
                            badge.cls
                          )}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3 text-slate-600 dark:text-slate-300 text-center">{d.attempts}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-[260px]">
                    {d.error || (d.status === 'sent' && d.providerMessageId ? `ID: ${d.providerMessageId.slice(0, 12)}…` : '—')}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] text-slate-500 dark:text-slate-400">
        Label <strong>SIMULASI</strong> = tidak ada pesan dikirim ke Meta/nomor manapun. Baris LIVE hanya muncul
        bila mode live + kredensial valid + opt-in pelanggan. Status <strong>pending</strong> hidup di Antrean
        Outbox (menunggu diproses dispatcher) — begitu diproses menjadi baris riwayat (simulated/sent/failed).
        Label <strong>Diterima gateway</strong> = pesan diterima API Meta/Fonnte (tercatat providerMessageId),
        BUKAN bukti masuk ke HP — konfirmasi akhir dengan memeriksa layar HP penerima.
      </div>
    </div>
  );
}
