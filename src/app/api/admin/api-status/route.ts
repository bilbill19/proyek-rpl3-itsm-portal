/**
 * ============================================================================
 * GET /api/admin/api-status  ->  Status Integrasi API (ADMIN only, read-only)
 * ============================================================================
 *
 * Dipakai halaman Admin → Pengaturan Sistem → tab "Informasi API".
 *
 * Sifat pemeriksaan:
 *   - Admin-only (401 tanpa login, 403 untuk non-ADMIN) — divalidasi SERVER.
 *   - Read-only: `SELECT 1` + router/tool admin (COUNT Prisma read-only).
 *   - Setiap pemeriksaan dibatasi timeout (database 5 dtk, NVIDIA probe 8 dtk).
 *   - TIDAK mengirim WhatsApp, TIDAK membuat pesanan, TIDAK menulis database.
 *   - Ping NVIDIA NIM TIDAK PERNAH otomatis — hanya saat `?nvidia=1` (dipanggil
 *     oleh tombol "Periksa Status" di UI), dengan rate limit probe 10/menit
 *     per admin dan payload minimal (max_tokens 4) agar kuota tidak terbuang.
 *   - Respons HANYA berisi status/latency/nama model — TANPA API key, token,
 *     cookie, isi .env, maupun detail error internal (connection string dsb).
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { runAdminRouter } from '@/lib/ai/knowledge/router';
import {
  NVIDIA_NIM_ENDPOINT,
  NVIDIA_DEFAULT_MODEL,
  isNvidiaConfigured,
  getNvidiaApiKey,
} from '@/lib/ai/nvidia';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (bukan Edge) — wajib untuk Prisma & fetch server.
export const runtime = 'nodejs';

type Status = 'Aktif' | 'Tidak Aktif' | 'Gangguan' | 'Belum Diperiksa';

interface CheckResult {
  status: Status;
  latencyMs: number | null;
  note?: string;
}

/**
 * Nama tampilan provider dari env AI_PROVIDER — HANYA label publik
 * (tanpa nilai API key, tanpa isi konfigurasi lain).
 */
function resolveProviderDisplay(): string {
  const p = (process.env.AI_PROVIDER || 'expert').toLowerCase().trim();
  switch (p) {
    case 'nvidia':
    case 'nvidia-nim':
    case 'nim':
      return 'NVIDIA NIM';
    case 'gemini':
    case 'google':
      return 'Google Gemini';
    case 'openai':
    case 'chatgpt':
      return 'OpenAI';
    case 'anthropic':
    case 'claude':
      return 'Anthropic Claude';
    case 'ollama':
      return 'Ollama (lokal)';
    case 'expert':
    default:
      return 'ExpertEngine (fallback lokal)';
  }
}

const DB_TIMEOUT_MS = 5_000;
const ROUTER_TIMEOUT_MS = 5_000;
const NVIDIA_PROBE_TIMEOUT_MS = 8_000;
/** Probe NVIDIA: maksimal 10x/menit per admin (tombol "Periksa Status"). */
const NVIDIA_PROBE_RATE_LIMIT = 10;
const NVIDIA_PROBE_RATE_WINDOW_MS = 60_000;

/** Probe router deterministik — PERTANYAAN TETAP, tanpa parameter user. */
const DETERMINISTIC_PROBE_QUESTION = 'Berapa total pesanan?';

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} melebihi ${ms} ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    // 1. Autentikasi & otorisasi ADMIN (server-side, bukan sekadar UI).
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Khusus Administrator.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const checkNvidia = url.searchParams.get('nvidia') === '1';

    // Latency backend diukur SEBELUM probe NVIDIA — supaya tidak ikut
    // terbengkak oleh waktu tunggu probe (timeout hingga 8 detik).
    const backendLatencyMs = Date.now() - startedAt;

    // 2. Koneksi DATABASE — query read-only paling ringan dengan timeout.
    const dbStart = Date.now();
    let database: CheckResult;
    try {
      await withTimeout(prisma.$queryRaw`SELECT 1`, DB_TIMEOUT_MS, 'database');
      database = { status: 'Aktif', latencyMs: Date.now() - dbStart };
    } catch {
      // Detail error sengaja TIDAK diteruskan (bisa memuat info koneksi).
      database = {
        status: 'Tidak Aktif',
        latencyMs: null,
        note: 'Query read-only gagal atau melebihi timeout.',
      };
    }

    // 3. DETERMINISTIC MIKO — jalankan router+tool admin yang sama dengan
    //    pipeline (COUNT Prisma read-only, tanpa NVIDIA, tanpa menulis data).
    const detStart = Date.now();
    let deterministic: CheckResult;
    try {
      const routed = await withTimeout(
        runAdminRouter(DETERMINISTIC_PROBE_QUESTION, 'ADMIN'),
        ROUTER_TIMEOUT_MS,
        'deterministic'
      );
      deterministic =
        routed.meta.executed && routed.meta.toolName === 'order_count'
          ? {
              status: 'Aktif',
              latencyMs: Date.now() - detStart,
              note: 'Intent terdeteksi & COUNT database sukses (jalur tanpa NVIDIA NIM).',
            }
          : {
              status: 'Tidak Aktif',
              latencyMs: Date.now() - detStart,
              note: 'Router tidak mengenali pertanyaan probe statistik.',
            };
    } catch {
      deterministic = {
        status: 'Tidak Aktif',
        latencyMs: null,
        note: 'Router/tool deterministik gagal dijalankan.',
      };
    }

    // 4. NVIDIA NIM — default "Belum Diperiksa"; HANYA dip probe bila diminta.
    const model = (process.env.NVIDIA_MODEL || '').trim() || NVIDIA_DEFAULT_MODEL;
    const configured = isNvidiaConfigured();
    let nvidia: CheckResult = {
      status: 'Belum Diperiksa',
      latencyMs: null,
      note: 'Tekan tombol "Periksa Status" untuk mengirim probe minimal (tidak otomatis).',
    };

    if (checkNvidia) {
      if (!configured) {
        nvidia = {
          status: 'Tidak Aktif',
          latencyMs: null,
          note: 'API key NVIDIA belum dikonfigurasi di server.',
        };
      } else if (!checkRateLimit(`api-status-nvidia:${session.id}`, NVIDIA_PROBE_RATE_LIMIT, NVIDIA_PROBE_RATE_WINDOW_MS)) {
        nvidia = {
          status: 'Belum Diperiksa',
          latencyMs: null,
          note: `Batas probe (${NVIDIA_PROBE_RATE_LIMIT}/menit) tercapai. Coba lagi sebentar lagi.`,
        };
      } else {
        const nimStart = Date.now();
        try {
          const apiKey = getNvidiaApiKey();
          const res = await fetch(NVIDIA_NIM_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            // Payload minimal (1 pesan pendek, max_tokens 4) — cukup untuk
            // membuktikan endpoint merespons, tanpa membakar kuota.
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: 'OK' }],
              max_tokens: 4,
              temperature: 0,
              stream: false,
            }),
            cache: 'no-store',
            signal: AbortSignal.timeout(NVIDIA_PROBE_TIMEOUT_MS),
          });
          nvidia = res.ok
            ? {
                status: 'Aktif',
                latencyMs: Date.now() - nimStart,
                note: `Probe minimal sukses (HTTP ${res.status}).`,
              }
            : {
                status: 'Gangguan',
                latencyMs: Date.now() - nimStart,
                note: `Endpoint NIM merespons HTTP ${res.status}.`,
              };
        } catch (error: any) {
          const isTimeout =
            error?.name === 'TimeoutError' || error?.name === 'AbortError';
          nvidia = {
            status: 'Gangguan',
            latencyMs: null,
            // Klasifikasi TIDAK berubah (status tetap 'Gangguan'); hanya penjelasan
            // penyebab dibuat lebih jelas: timeout = provider eksternal tak merespons.
            note: isTimeout
              ? `Timeout — provider eksternal belum merespons dalam ${NVIDIA_PROBE_TIMEOUT_MS / 1000} detik.`
              : 'Tidak dapat terhubung ke endpoint NVIDIA NIM.',
          };
        }
      }
    }

    return NextResponse.json(
      {
        backend: { status: 'Aktif' as Status, latencyMs: backendLatencyMs },
        database,
        deterministic,
        nvidia,
        // Nama model aktif saja — BUKAN API key/token (tidak pernah dikirim).
        model,
        nvidiaConfigured: configured,
        // Provider yang BENAR-BENAR dipakai pipeline (dibaca dari env server)
        // + status kredensial Gemini (boolean saja — tanpa nilai key).
        provider: resolveProviderDisplay(),
        geminiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
        checkedAt: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('Error pada /api/admin/api-status:', error?.message || error);
    return NextResponse.json(
      { error: 'Pemeriksaan status gagal dijalankan. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
