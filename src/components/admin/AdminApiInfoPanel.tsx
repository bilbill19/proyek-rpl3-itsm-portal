'use client';

/**
 * AdminApiInfoPanel — tab "Informasi API" pada halaman Pengaturan Sistem Admin.
 *
 * Menampilkan: arsitektur API, daftar endpoint AKTUAL (hasil audit route.ts),
 * status integrasi (pemeriksaan server, admin-only, read-only, timeout),
 * penjelasan alur deterministic vs NVIDIA NIM, catatan keamanan, dan demo
 * stateless cara kerja API Miko.
 *
 * SECURITY: komponen ini TIDAK PERNAH menerima/menampilkan API key, token,
 * cookie, atau isi .env — hanya data status dari GET /api/admin/api-status
 * (server sudah memvalidasi role ADMIN dan menyaring keluaran).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Server,
  Database,
  Cpu,
  Sparkles,
  KeyRound,
  Wrench,
  ClipboardList,
  Users,
  Package,
  MapPin,
  Bell,
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  PlayCircle,
  Zap,
  Bot,
  Lock,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { parseMarkdown } from '@/lib/ai/markdown';

/* -------------------------------------------------------------------------- */
/* Tipe data status dari server                                               */
/* -------------------------------------------------------------------------- */

type StatusValue = 'Aktif' | 'Tidak Aktif' | 'Gangguan' | 'Belum Diperiksa';

interface CheckResult {
  status: StatusValue;
  latencyMs: number | null;
  note?: string;
}

interface ApiStatusResponse {
  backend: CheckResult;
  database: CheckResult;
  deterministic: CheckResult;
  nvidia: CheckResult;
  model: string;
  /** Nama tampilan provider dari server (env AI_PROVIDER) — label, bukan hasil uji koneksi. */
  provider?: string;
  nvidiaConfigured: boolean;
  checkedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Daftar endpoint — HASIL AUDIT source code (route.ts di folder src/app/api)  */
/* -------------------------------------------------------------------------- */

interface EndpointRow {
  path: string;
  method: string;
  fn: string;
}
interface EndpointGroup {
  name: string;
  icon: React.ElementType;
  endpoints: EndpointRow[];
}

const API_GROUPS: EndpointGroup[] = [
  {
    name: 'API Autentikasi',
    icon: KeyRound,
    endpoints: [
      { path: '/api/auth/login', method: 'POST', fn: 'Login & penerbitan sesi (JWT HttpOnly)' },
      { path: '/api/auth/logout', method: 'POST, GET', fn: 'Akhiri sesi pengguna' },
      { path: '/api/auth/register', method: 'POST', fn: 'Registrasi akun Customer' },
      { path: '/api/auth/forgot-password', method: 'POST', fn: 'Permintaan reset sandi via email' },
      { path: '/api/auth/reset-password', method: 'POST', fn: 'Reset sandi dengan token sekali pakai' },
    ],
  },
  {
    name: 'API Layanan',
    icon: Wrench,
    endpoints: [
      { path: '/api/services', method: 'GET, POST', fn: 'Daftar & tambah katalog layanan servis' },
      { path: '/api/services/[id]', method: 'GET, PATCH, DELETE', fn: 'Detail, ubah, hapus layanan' },
    ],
  },
  {
    name: 'API Pesanan',
    icon: ClipboardList,
    endpoints: [
      { path: '/api/orders', method: 'GET, POST', fn: 'Daftar & buat pesanan service' },
      { path: '/api/orders/[id]', method: 'GET, PATCH', fn: 'Detail & perbarui pesanan/tiket' },
    ],
  },
  {
    name: 'API Customer',
    icon: Users,
    endpoints: [
      { path: '/api/customers', method: 'GET', fn: 'Daftar customer (admin)' },
      { path: '/api/customers/[id]', method: 'GET, PATCH, DELETE', fn: 'Detail, ubah, hapus customer' },
    ],
  },
  {
    name: 'API Inventaris',
    icon: Package,
    endpoints: [
      { path: '/api/inventory', method: 'GET, POST', fn: 'Daftar & tambah item inventaris' },
      { path: '/api/inventory/[id]', method: 'GET, PATCH, DELETE', fn: 'Detail, ubah, hapus item' },
    ],
  },
  {
    name: 'API Pelacakan Publik',
    icon: MapPin,
    endpoints: [{ path: '/api/track', method: 'GET', fn: 'Lacak status tiket tanpa login (publik)' }],
  },
  {
    name: 'API Notifikasi',
    icon: Bell,
    endpoints: [
      { path: '/api/notifications', method: 'GET', fn: 'Daftar notifikasi pengguna' },
      { path: '/api/notifications/[id]', method: 'PATCH', fn: 'Tandai satu notifikasi dibaca' },
      { path: '/api/notifications/read-all', method: 'POST', fn: 'Tandai semua notifikasi dibaca' },
    ],
  },
  {
    name: 'API WhatsApp',
    icon: MessageSquare,
    endpoints: [
      { path: '/api/whatsapp/webhook', method: 'GET, POST', fn: 'Webhook provider WhatsApp (verifikasi & pesan masuk)' },
      { path: '/api/whatsapp/preferences', method: 'GET, PATCH', fn: 'Preferensi notifikasi WhatsApp pengguna' },
      { path: '/api/whatsapp/deliveries', method: 'GET', fn: 'Riwayat pengiriman pesan (read-only)' },
    ],
  },
  {
    name: 'API Admin (Manajemen User)',
    icon: ShieldCheck,
    endpoints: [
      { path: '/api/admin/users', method: 'GET, POST', fn: 'Daftar & tambah pengguna (admin)' },
      { path: '/api/admin/users/[id]', method: 'PATCH', fn: 'Ubah role/status pengguna (admin)' },
      { path: '/api/admin/api-status', method: 'GET', fn: 'Pemeriksaan status integrasi API (admin-only, read-only)' },
    ],
  },
  {
    name: 'API Chatbot AI (Mimo & Miko)',
    icon: Bot,
    endpoints: [
      { path: '/api/ai/chat', method: 'POST', fn: 'Mimo — chatbot publik beranda (tanpa login, tanpa penyimpanan riwayat)' },
      { path: '/api/ai/conversations', method: 'GET, POST', fn: 'Miko Customer — daftar & buat percakapan (wajib autentikasi, riwayat tersimpan)' },
      { path: '/api/ai/conversations/[id]', method: 'GET, DELETE', fn: 'Miko Customer — ambil & hapus percakapan milik sendiri (wajib login)' },
      { path: '/api/ai/conversations/[id]/messages', method: 'POST', fn: 'Miko Customer — kirim pesan; riwayat tersimpan ke database' },
      { path: '/api/ai/admin', method: 'POST', fn: 'Miko Admin — chatbot administrator (stateless, tanpa penyimpanan riwayat)' },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Penjelasan alur                                                            */
/* -------------------------------------------------------------------------- */

const DETERMINISTIC_FLOW = [
  'Pertanyaan Admin',
  'API Node.js',
  'Intent Router',
  'Prisma',
  'PostgreSQL',
  'Jawaban Miko',
];

const NIM_FLOW = ['Pertanyaan', 'API Node.js', 'AI Pipeline', 'NVIDIA NIM', 'Respons Miko'];

const STATUS_VARIANT: Record<StatusValue, 'success' | 'danger' | 'warning' | 'default'> = {
  Aktif: 'success',
  'Tidak Aktif': 'danger',
  Gangguan: 'warning',
  'Belum Diperiksa': 'default',
};

/* -------------------------------------------------------------------------- */
/* Komponen                                                                   */
/* -------------------------------------------------------------------------- */

export function AdminApiInfoPanel() {
  const [status, setStatus] = useState<ApiStatusResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    question: string;
    reply: string;
    provider: string;
    durationMs: number;
  } | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  const DEMO_QUESTION = 'Berapa total pesanan?';

  const [mimoDemoRunning, setMimoDemoRunning] = useState(false);
  const [mimoDemoResult, setMimoDemoResult] = useState<{
    question: string;
    reply: string;
    provider: string;
    durationMs: number;
  } | null>(null);
  const [mimoDemoError, setMimoDemoError] = useState<string | null>(null);

  const MIMO_DEMO_QUESTION = 'Layanan perbaikan laptop apa saja yang tersedia?';

  /** Pemeriksaan dasar saat tab dibuka — TANPA ping NVIDIA. */
  const loadStatus = useCallback(async (withNvidiaProbe: boolean) => {
    setIsChecking(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/admin/api-status${withNvidiaProbe ? '?nvidia=1' : ''}`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setStatus(data as ApiStatusResponse);
    } catch (e: any) {
      setStatusError(e?.message || 'Gagal memeriksa status integrasi API.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    loadStatus(false);
  }, [loadStatus]);

  /** Demo stateless: POST /api/ai/admin — TIDAK menyimpan percakapan. */
  const runDemo = async () => {
    setDemoRunning(true);
    setDemoError(null);
    try {
      const started = performance.now();
      const res = await fetch('/api/ai/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: DEMO_QUESTION, history: [] }),
      });
      const durationMs = Math.round(performance.now() - started);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setDemoResult({
        question: DEMO_QUESTION,
        reply: data.reply,
        provider: data.provider || 'unknown',
        durationMs,
      });
    } catch (e: any) {
      setDemoError(e?.message || 'Demo gagal dijalankan.');
    } finally {
      setDemoRunning(false);
    }
  };

  const isDeterministicProvider = (demoResult?.provider || '').startsWith('deterministic');

  /** Demo Mimo: endpoint admin LOKAL (gate domain → katalog DB → ExpertEngine) —
   *  TANPA memanggil /api/ai/chat dan TANPA request ke NVIDIA NIM. */
  const runMimoDemo = async () => {
    setMimoDemoRunning(true);
    setMimoDemoError(null);
    try {
      const started = performance.now();
      const res = await fetch('/api/admin/mimo-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: MIMO_DEMO_QUESTION }),
      });
      const durationMs = Math.round(performance.now() - started);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setMimoDemoResult({
        question: MIMO_DEMO_QUESTION,
        reply: data.reply,
        provider: data.provider || 'unknown',
        durationMs,
      });
    } catch (e: any) {
      setMimoDemoError(e?.message || 'Demo Mimo gagal dijalankan.');
    } finally {
      setMimoDemoRunning(false);
    }
  };

  /** Label "Jenis Pemrosesan" yang jujur — mengikuti jalur SESUNGGUHNYA dari server
   *  (deterministic-* = katalog DB; scope-restriction = gate domain; else ExpertEngine lokal). */
  const mimoProcessing = !mimoDemoResult
    ? null
    : mimoDemoResult.provider.startsWith('deterministic')
      ? { label: 'Deterministic', variant: 'success' as const }
      : mimoDemoResult.provider === 'scope-restriction'
        ? { label: 'Scope Gate (Lokal)', variant: 'warning' as const }
        : { label: 'ExpertEngine (Lokal)', variant: 'info' as const };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================================ */}
      {/* A. RINGKASAN ARSITEKTUR API                                      */}
      {/* ================================================================ */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Ringkasan Arsitektur API
          </CardTitle>
          <CardDescription>
            Teknologi yang mendasari seluruh layanan ITSM Portal — dari request browser hingga
            jawaban chatbot AI (Mimo & Miko).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <InfoTile icon={Server} label="Backend" value="Node.js" tint="indigo" />
            <InfoTile icon={Cpu} label="Framework API" value="Next.js Route Handlers" tint="indigo" />
            <InfoTile icon={Database} label="Database" value="PostgreSQL" tint="emerald" />
            <InfoTile icon={Database} label="ORM" value="Prisma" tint="emerald" />
            <InfoTile
              icon={Sparkles}
              label="AI Provider (dikonfigurasi)"
              value={status?.provider || 'NVIDIA NIM'}
              tint="purple"
            />
            <InfoTile
              icon={Bot}
              label="AI Model (dikonfigurasi)"
              value={status?.model ? status.model : 'Memuat dari server…'}
              tint="purple"
            />
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <b>Catatan istilah:</b> label &quot;dikonfigurasi&quot; berarti nilai dibaca dari
            konfigurasi server saat halaman dibuka — <b>belum merupakan bukti koneksi</b>. Status
            koneksi ke NVIDIA NIM hanya dapat dinyatakan berhasil setelah pemeriksaan aktual pada
            kartu &quot;Status Integrasi API&quot; (tombol <b>Periksa Status</b>). Chatbot publik{' '}
            <b>Mimo</b> dan chatbot internal <b>Miko</b> (customer & admin) sama-sama memakai
            NVIDIA NIM dengan model <code className="text-[10px]">openai/gpt-oss-20b</code>{' '}
            berdasarkan konfigurasi yang ditemukan, tetapi pipeline keduanya{' '}
            <b>tidak disamakan</b>: endpoint, aturan akses (publik vs wajib login), aturan
            pemrosesan deterministik, dan penyimpanan riwayat berbeda. Fallback lokal
            (ExpertEngine) hanya dipanggil saat NIM gagal — <b>bukan jaminan semua pertanyaan
            selalu berhasil dijawab</b>.
          </p>
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
            <p className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 mb-1">
              <Zap className="w-3.5 h-3.5" /> Metode Pemrosesan: Deterministic Processing + AI Provider
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Setiap pertanyaan dinilai lebih dulu oleh <b>Intent Router deterministik</b>. Bila
              pertanyaannya adalah data operasional (jumlah pesanan, customer, status tiket, dll.),
              jawabannya dihitung langsung dari database lewat Prisma — tanpa request ke AI eksternal.
              Untuk pertanyaan yang memerlukan penalaran (konsultasi teknis, diagnosis kerusakan),
              sistem meneruskannya ke <b>NVIDIA NIM</b> dengan fallback lokal bila provider tidak
              dapat dihubungi.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* B. DAFTAR ENDPOINT API                                            */}
      {/* ================================================================ */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Daftar Endpoint API Aktual
          </CardTitle>
          <CardDescription>
            Dihasilkan dari audit <code className="text-[10px]">src/app/api/**/route.ts</code> yang
            benar-benar ada di project (tanpa endpoint fiktif).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {API_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.name} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60">
                  <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{group.name}</span>
                </div>
                <div className="overflow-x-auto">
                  {/* table-fixed + colgroup dengan persentase yang SAMA di setiap
                      kategori: geometri kolom identik antar tabel sehingga badge
                      STATUS sejajar vertikal. Teks panjang (path/FUNGSI) membungkus
                      di kolomnya sendiri dan tidak pernah menggeser kolom STATUS. */}
                  <table className="w-full table-fixed text-xs min-w-[720px]">
                    <colgroup>
                      <col className="w-[25%]" />
                      <col className="w-[21%]" />
                      <col className="w-[36%]" />
                      <col className="w-[18%]" />
                    </colgroup>
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-2 font-semibold align-middle">Endpoint</th>
                        <th className="px-4 py-2 font-semibold align-middle">Method</th>
                        <th className="px-4 py-2 font-semibold align-middle">Fungsi</th>
                        <th className="px-4 py-2 font-semibold align-middle">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.endpoints.map((ep) => (
                        <tr key={ep.path} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                          <td className="px-4 py-2 align-middle font-mono text-[11px] text-slate-700 dark:text-slate-300 break-words">
                            {ep.path}
                          </td>
                          <td className="px-4 py-2 align-middle">
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold whitespace-nowrap">
                              {ep.method}
                            </span>
                          </td>
                          <td className="px-4 py-2 align-middle text-slate-600 dark:text-slate-400 break-words">
                            {ep.fn}
                          </td>
                          <td className="px-4 py-2 align-middle whitespace-nowrap">
                            <Badge variant="success">Tersedia</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            <b className="text-slate-700 dark:text-slate-300">
              Status &quot;Tersedia&quot; menunjukkan endpoint telah diimplementasikan dalam
              aplikasi, bukan hasil pengujian konektivitas atau keberhasilan setiap request.
            </b>{' '}
            Badge ini ditentukan dari keberadaan file route pada audit source code, bukan dari
            ping atau uji request per endpoint. Pemeriksaan konektivitas aktual (backend,
            database, router deterministik, NVIDIA NIM) dilakukan terpisah pada kartu &quot;Status
            Integrasi API&quot; melalui tombol Periksa Status. Tabel hanya menampilkan path,
            method, dan fungsi umum. Parameter internal, header autentikasi, dan detail
            konfigurasi server tidak dipublikasikan.
          </p>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* C. STATUS INTEGRASI API                                           */}
      {/* ================================================================ */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Status Integrasi API
            </CardTitle>
            <CardDescription>
              Pemeriksaan aktual dari server (admin-only, read-only, berbatas waktu). Ping NVIDIA
              NIM hanya dikirim saat tombol ditekan — tidak otomatis saat halaman dibuka.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => loadStatus(true)}
            disabled={isChecking}
            className="shadow-lg shadow-indigo-600/20"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Memeriksa…' : 'Periksa Status'}
          </Button>
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          {statusError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
              {statusError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatusRow
              label="Backend API"
              icon={Server}
              result={status?.backend ?? null}
              loading={!status && !statusError}
            />
            <StatusRow
              label="Database Connection (PostgreSQL)"
              icon={Database}
              result={status?.database ?? null}
              loading={!status && !statusError}
            />
            <StatusRow
              label="Deterministic Miko (Intent Router + Prisma)"
              icon={Zap}
              result={status?.deterministic ?? null}
              loading={!status && !statusError}
            />
            <StatusRow
              label="NVIDIA NIM"
              icon={Sparkles}
              result={status?.nvidia ?? null}
              loading={!status && !statusError}
            />
          </div>
          {/* Indikator keberlangsungan chatbot: fallback lokal ExpertEngine memang
              teruji berjalan (Demo Mimo di halaman ini), sehingga chatbot tetap
              OPERASIONAL walau NVIDIA NIM timeout — tanpa mengubah status NVIDIA. */}
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Layanan AI Chatbot
              </span>
            </div>
            <Badge variant="success">OPERASIONAL (Fallback Lokal)</Badge>
            <p className="w-full text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
              Saat NVIDIA NIM timeout, chatbot tetap menjawab melalui mesin diagnosis lokal
              ExpertEngine (tanpa jaringan) — jalur fallback ini teruji berjalan pada Demo Mimo
              di halaman ini. Status NVIDIA NIM tetap ditampilkan apa adanya.
            </p>
          </div>
          {status && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Diperiksa pada:{' '}
              <span className="font-mono">{new Date(status.checkedAt).toLocaleString('id-ID')}</span>
              {status.nvidia && status.nvidia.status === 'Belum Diperiksa' && (
                <> — status NVIDIA sengaja &quot;Belum Diperiksa&quot; sampai Anda menekan tombol.</>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* D. PENJELASAN MIKO CEPAT MENJAWAB                                 */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              1. Pemrosesan Deterministik
            </CardTitle>
            <CardDescription>Statistik operasional dijawab dari database, bukan AI.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-4 text-xs">
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Digunakan untuk:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Jumlah pesanan',
                  'Jumlah customer',
                  'Pesanan baru',
                  'Pesanan diproses',
                  'Pesanan selesai',
                  'Menunggu persetujuan',
                  'Pertanyaan operasional lain yang didukung',
                ].map((item) => (
                  <span
                    key={item}
                    className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-100 dark:border-emerald-900/60"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <FlowDiagram steps={DETERMINISTIC_FLOW} tone="emerald" />
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Jalur ini <b>tidak mengirim request sama sekali ke NVIDIA NIM</b> — Intent Router
              mengenali pertanyaan, lalu Prisma menghitung data langsung dari PostgreSQL
              (read-only). Karena hanya query database lokal, respons dapat selesai dalam puluhan
              milidetik dan tetap akurat saat layanan AI eksternal sedang gangguan.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              2. Pemrosesan AI NVIDIA NIM
            </CardTitle>
            <CardDescription>Penalaran AI untuk pertanyaan yang tidak terstruktur.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-4 text-xs">
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1.5">Digunakan untuk:</p>
              <div className="flex flex-wrap gap-1.5">
                {['Konsultasi teknis IT', 'Diagnosis masalah komputer', 'Pertanyaan teknis yang memerlukan penalaran AI'].map(
                  (item) => (
                    <span
                      key={item}
                      className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 text-[10px] font-semibold border border-purple-100 dark:border-purple-900/60"
                    >
                      {item}
                    </span>
                  )
                )}
              </div>
            </div>
            <FlowDiagram steps={NIM_FLOW} tone="purple" />
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              Pertanyaan yang membutuhkan penalaran diteruskan ke model NVIDIA NIM melalui AI
              Pipeline dengan konteks terbatas dari sistem. Ketika NVIDIA mengalami timeout atau
              gangguan, sistem menggunakan <b>fallback lokal</b> (mesin diagnosis built-in dan
              ringkasan database) sesuai kemampuan yang tersedia — pertanyaan statistik tetap
              terjawab karena tidak bergantung NIM.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ================================================================ */}
      {/* E. KEAMANAN API                                                  */}
      {/* ================================================================ */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Keamanan API
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <b className="text-slate-800 dark:text-slate-200">
              API key dan token autentikasi disimpan secara aman di sisi server dan tidak
              ditampilkan pada halaman ini.
            </b>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>API key NVIDIA hanya dibaca dari environment variable server (tidak pernah dikirim ke browser).</li>
              <li>Sesi memakai cookie HttpOnly — token tidak bisa dibaca script halaman.</li>
              <li>Seluruh endpoint operasional memvalidasi login & role di server; data customer selalu difilter per pemilik sesi.</li>
              <li>Pemeriksaan status hanya untuk Administrator dan bersifat read-only.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================ */}
      {/* F. DEMO MIKO ADMIN & DEMO MIMO (CHATBOT PUBLIK)                  */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Demo Cara Kerja API Miko
              </CardTitle>
              <CardDescription>
                Menjalankan pertanyaan statistik melalui endpoint admin{' '}
                <code className="text-[10px]">POST /api/ai/admin</code> yang asli — tanpa angka
                hardcode, tanpa memanggil NVIDIA untuk statistik.
              </CardDescription>
            </div>
            <Button size="sm" onClick={runDemo} disabled={demoRunning} className="shadow-lg shadow-indigo-600/20">
              <PlayCircle className="w-4 h-4 mr-1.5" />
              {demoRunning ? 'Menjalankan…' : 'Jalankan Demo'}
            </Button>
          </CardHeader>
          <CardContent className="pt-2 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Pertanyaan</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200 font-semibold">&quot;{DEMO_QUESTION}&quot;</p>
            </div>

            {demoError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
                {demoError}
              </div>
            )}

            {demoResult && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-indigo-700 dark:text-indigo-300">
                    Jawaban Aktual Miko
                  </span>
                  {/* Respons Miko dirender memakai shared markdown renderer yang sama
                      dengan chat Miko/Mimo (React element, tanpa dangerouslySetInnerHTML):
                      heading ###, bold, italic, daftar, dan tabel tampil rapi tanpa
                      simbol Markdown mentah. break-words: teks panjang tetap di dalam
                      kartu. Konten jawaban TIDAK diubah — hanya cara render. */}
                  <div className="mt-1 break-words text-slate-800 dark:text-slate-200 leading-relaxed">
                    {parseMarkdown(demoResult.reply)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Jenis Pemrosesan</p>
                    <p className="mt-1">
                      <Badge variant={isDeterministicProvider ? 'success' : 'warning'}>
                        {isDeterministicProvider ? 'Deterministic' : demoResult.provider}
                      </Badge>
                    </p>
                  </div>
                  <div className="min-w-0 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Provider</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-words min-w-0">
                      {demoResult.provider}
                    </p>
                  </div>
                  <div className="min-w-0 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Durasi Respons</p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">{demoResult.durationMs} ms</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Demo memakai endpoint <b>stateless</b> <code className="text-[10px]">/api/ai/admin</code>:
              pertanyaan dijalankan lewat pipeline yang sama dengan chat Miko, namun{' '}
              <b>tidak menyimpan percakapan</b> ke riwayat maupun database — aman dijalankan
              berulang saat presentasi. Angka pada jawaban dihitung langsung dari database pada saat
              demo dijalankan.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Demo Mimo (Chatbot Publik Beranda)
              </CardTitle>
              <CardDescription>
                Menjalankan pertanyaan contoh lewat jalur <b>lokal</b> yang sama dengan Mimo —
                gate domain, katalog layanan dari database, lalu ExpertEngine —{' '}
                <b>tanpa request ke NVIDIA NIM</b>.
              </CardDescription>
            </div>
            <Button size="sm" onClick={runMimoDemo} disabled={mimoDemoRunning} className="shadow-lg shadow-indigo-600/20">
              <PlayCircle className="w-4 h-4 mr-1.5" />
              {mimoDemoRunning ? 'Menjalankan…' : 'Jalankan Demo Mimo'}
            </Button>
          </CardHeader>
          <CardContent className="pt-2 space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Pertanyaan</span>
              <p className="mt-1 text-slate-800 dark:text-slate-200 font-semibold">&quot;{MIMO_DEMO_QUESTION}&quot;</p>
            </div>

            {mimoDemoError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300">
                {mimoDemoError}
              </div>
            )}

            {mimoDemoResult && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
                  <span className="text-[10px] uppercase tracking-wide font-bold text-indigo-700 dark:text-indigo-300">
                    Jawaban Aktual Mimo
                  </span>
                  <div className="mt-1 break-words text-slate-800 dark:text-slate-200 leading-relaxed">
                    {parseMarkdown(mimoDemoResult.reply)}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Jenis Pemrosesan</p>
                    <p className="mt-1">
                      <Badge variant={mimoProcessing?.variant || 'default'}>
                        {mimoProcessing?.label || mimoDemoResult.provider}
                      </Badge>
                    </p>
                  </div>
                  <div className="min-w-0 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Provider</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-words min-w-0">
                      {mimoDemoResult.provider}
                    </p>
                  </div>
                  <div className="min-w-0 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-500">Durasi Respons</p>
                    <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">{mimoDemoResult.durationMs} ms</p>
                  </div>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Demo memakai endpoint admin <b>POST /api/admin/mimo-demo</b> yang berjalan{' '}
              <b>lokal</b>: gate domain → katalog database (read-only) → ExpertEngine beridentitas
              Mimo. Route ini <b>tidak pernah memanggil NVIDIA NIM</b> (tanpa kuota AI eksternal),
              memerlukan sesi <b>Admin</b>, dan <b>tidak menyimpan percakapan</b> — jawaban demo
              tidak menjadi riwayat Customer dan aman dijalankan berulang saat presentasi.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-komponen kecil                                                         */
/* -------------------------------------------------------------------------- */

function InfoTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tint: 'indigo' | 'emerald' | 'purple';
}) {
  const tintClass =
    tint === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tint === 'purple'
        ? 'text-purple-600 dark:text-purple-400'
        : 'text-indigo-600 dark:text-indigo-400';
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${tintClass}`} />
      </div>
      <p className="text-sm font-black text-slate-900 dark:text-white break-words">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  icon: Icon,
  result,
  loading,
}: {
  label: string;
  icon: React.ElementType;
  result: CheckResult | null;
  loading: boolean;
}) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{label}</span>
        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
      </div>
      {loading ? (
        <p className="text-xs text-slate-400">Memuat…</p>
      ) : result ? (
        <>
          <Badge variant={STATUS_VARIANT[result.status]}>{result.status}</Badge>
          {result.latencyMs !== null && (
            <p className="mt-1.5 text-[11px] text-slate-500">
              Latency: <span className="font-mono">{result.latencyMs}ms</span>
            </p>
          )}
          {result.note && (
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{result.note}</p>
          )}
        </>
      ) : (
        <Badge>Belum Diperiksa</Badge>
      )}
    </div>
  );
}

function FlowDiagram({ steps, tone }: { steps: string[]; tone: 'emerald' | 'purple' }) {
  const toneClass =
    tone === 'emerald'
      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60'
      : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-100 dark:border-purple-900/60';
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, i) => (
        <React.Fragment key={step}>
          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${toneClass}`}>{step}</span>
          {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
        </React.Fragment>
      ))}
    </div>
  );
}
