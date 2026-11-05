'use client';

/**
 * Kartu preferensi notifikasi WhatsApp (P7) — halaman profil pelanggan.
 *
 * - Menampilkan nomor WhatsApp TERSIMPAN (milik akun sendiri) + status opt-in.
 * - Opt-in/opt-out dikirim ke PATCH /api/whatsapp/preferences.
 * - Jujur soal batasan: nomor bersifat tersimpan (belum ada verifikasi), dan
 *   notifikasi in-app portal TETAP tampil walau opsi WhatsApp dimatikan.
 * - Tanpa token/kredensial apa pun di payload maupun tampilan.
 */
import React, { useEffect, useState } from 'react';
import { MessageCircle, Phone, ShieldCheck, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';

export function WhatsAppPrefsCard() {
  const [phone, setPhone] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/whatsapp/preferences', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!alive) return;
        setPhone(data.phone || null);
        setEnabled(!!data.enabled);
      } catch {
        if (alive) setError('Gagal memuat preferensi. Coba muat ulang halaman.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const toggle = async (next: boolean) => {
    setEnabled(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Gagal menyimpan preferensi.');
      }
      const data = await res.json().catch(() => null);
      setEnabled(!!data.enabled);
    } catch (e: any) {
      setEnabled(!next); // rollback optimistik
      setError(e?.message || 'Gagal menyimpan preferensi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Notifikasi & WhatsApp
        </CardTitle>
        <CardDescription>
          Notifikasi in-app selalu tampil di lonceng; WhatsApp bersifat opt-in
        </CardDescription>
      </CardHeader>

      <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-4">
        {/* Nomor tersimpan */}
        <div className="space-y-2">
          <label className="text-slate-700 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Nomor WhatsApp Tersimpan
          </label>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold break-all">
            {loading ? 'Memuat…' : phone || 'Belum ada nomor (isi saat registrasi)'}
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-500">
            Nomor bersifat <strong>tersimpan</strong> dari data akun — sistem ini belum memiliki mekanisme
            verifikasi nomor, sehingga tidak diklaim &quot;terverifikasi&quot;.
          </p>
        </div>

        {/* Saklar opt-in */}
        <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-white">
              Kirim update status via WhatsApp
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {enabled ? 'Aktif (opt-in) — pesan hanya dikirim saat server mode LIVE.' : 'Nonaktif (opt-out) — tidak ada pesan WhatsApp yang dikirim.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Aktifkan notifikasi WhatsApp"
            disabled={loading || saving}
            onClick={() => toggle(!enabled)}
            className={`shrink-0 w-11 h-6 rounded-full transition-colors relative disabled:opacity-60 ${
              enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {saving && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan…
          </p>
        )}
        {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Notifikasi <strong>in-app</strong> (lonceng) tetap terlihat walau opsi ini dimatikan.
            Saat mode <strong>SIMULASI</strong> di server, sistem hanya menyimpan preview internal —
            tanpa mengirim pesan apa pun ke nomor Anda.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
