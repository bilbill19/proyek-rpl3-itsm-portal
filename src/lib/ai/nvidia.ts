/**
 * ============================================================================
 * NVIDIA NIM (NVIDIA API Catalog) AI Provider
 * ============================================================================
 *
 * Provider chat-completion OpenAI-compatible resmi dari NVIDIA.
 *
 *   Endpoint : POST https://integrate.api.nvidia.com/v1/chat/completions
 *   Auth     : Authorization: Bearer <NVIDIA_API_KEY>
 *
 *   Dokumentasi resmi:
 *     - https://docs.api.nvidia.com   (NIM / API Catalog reference)
 *     - https://build.nvidia.com      (Generate API Key -> NVIDIA_API_KEY)
 *
 * Catatan: endpoint /v1/models dan /v1/chat/completions pada base URL tersebut
 * diverifikasi langsung sebelum implementasi (HTTP 200).
 *
 * SECURITY (WAJIB DIPERTAHANKAN):
 *   - API key hanya dibaca dari `process.env` => hanya bisa diakses server-side.
 *   - File ini TIDAK BOLEH di-import dari Client Component (`'use client'`).
 *   - Nilai API key tidak pernah dikirim ke browser, response, maupun console.
 *   - Semua pesan error di-scrub dari nilai API key sebelum di-log.
 * ============================================================================
 */

import type { AIProviderInterface, AIResponseResult, ChatMessage } from './index';

/** Base endpoint resmi NVIDIA NIM (OpenAI-compatible). */
export const NVIDIA_NIM_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

/** Model default: multilingual & kuat untuk bahasa Indonesia. */
export const NVIDIA_DEFAULT_MODEL = 'mistralai/mistral-large-2-instruct';

/**
 * Batas waktu tunggu respons NIM sebelum dianggap gagal.
 * 25 detik (sebelumnya 45 dtk): respons AI lambat/macet tidak membuat user
 * menunggu terlalu lama — fallback deterministik (relevan, jujur) lebih cepat
 * mengambil alih. Jawaban normal NIM selesai jauh di bawah batas ini.
 */
const REQUEST_TIMEOUT_MS = 25_000;

interface OpenAICompatibleMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Ambil API key NVIDIA dari environment variable (server-side only).
 * Mendukung NVIDIA_API_KEY (utama) dan NVIDIA_KEY_ID (alternatif).
 */
export function getNvidiaApiKey(): string | null {
  const candidates = [process.env.NVIDIA_API_KEY, process.env.NVIDIA_KEY_ID];

  for (const raw of candidates) {
    const key = (raw ?? '').trim();
    if (key.length > 0) return key;
  }

  return null;
}

/** True bila minimal satu key NVIDIA sudah dikonfigurasi di server. */
export function isNvidiaConfigured(): boolean {
  return getNvidiaApiKey() !== null;
}

/**
 * Scrub nilai API key dari sebuah string sebelum string tersebut di-log.
 * Mencegah kebocoran secret ke console / terminal / APM.
 */
function scrubSecrets(text: string): string {
  let safe = text ?? '';

  const key = getNvidiaApiKey();
  if (key && key.length >= 8) {
    safe = safe.split(key).join('[REDACTED]');
  }

  // Format standar key NVIDIA: nvapi-xxxx
  return safe.replace(/nvapi-[A-Za-z0-9_-]{4,}/g, '[REDACTED]');
}

function toOpenAiRole(role: ChatMessage['role']): OpenAICompatibleMessage['role'] {
  if (role === 'ASSISTANT') return 'assistant';
  if (role === 'SYSTEM') return 'system';
  return 'user';
}

/**
 * Implementasi provider NVIDIA NIM.
 *
 * Mengikuti kontrak `AIProviderInterface` yang sama dengan provider lain
 * (Gemini, OpenAI, Anthropic, Ollama, ExpertEngine) sehingga dapat dipakai
 * ulang oleh seluruh fitur AI aplikasi ini melalui `generateAIResponse()`.
 */
export class NvidiaNimProvider implements AIProviderInterface {
  name = 'nvidia-nim';

  constructor(private readonly systemPrompt: string) {}

  async generateResponse(
    messages: ChatMessage[],
    userLatestQuery: string
  ): Promise<AIResponseResult> {
    const apiKey = getNvidiaApiKey();
    if (!apiKey) {
      throw new Error('NVIDIA_API_KEY / NVIDIA_KEY_ID belum dikonfigurasi di server.');
    }

    const model =
      (process.env.NVIDIA_MODEL || '').trim() || NVIDIA_DEFAULT_MODEL;

    // Susun riwayat percakapan format OpenAI-compatible.
    const chatMessages: OpenAICompatibleMessage[] = [
      { role: 'system', content: this.systemPrompt },
      ...messages.map((m) => ({ role: toOpenAiRole(m.role), content: m.content })),
    ];

    // Pastikan query terbaru selalu ikut terkirim.
    if (
      messages.length === 0 ||
      messages[messages.length - 1].content !== userLatestQuery
    ) {
      chatMessages.push({ role: 'user', content: userLatestQuery });
    }

    let response: Response;

    try {
      response = await fetch(NVIDIA_NIM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: chatMessages,
          temperature: 0.4,
          top_p: 0.9,
          max_tokens: 1200,
          stream: false,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error: any) {
      const isTimeout =
        error?.name === 'TimeoutError' || error?.name === 'AbortError';

      const reason = isTimeout
        ? `timeout setelah ${REQUEST_TIMEOUT_MS / 1000} detik`
        : 'tidak dapat terhubung ke server NVIDIA NIM';

      throw new Error(`NVIDIA NIM ${reason}: ${scrubSecrets(error?.message || '')}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(
        `NVIDIA NIM API Error (${response.status}): ${scrubSecrets(errorText).slice(0, 300)}`
      );
    }

    const data = await response.json().catch(() => null);
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
      throw new Error('NVIDIA NIM mengembalikan respons kosong.');
    }

    return {
      reply: reply.trim(),
      recommendedService: {
        name: 'Pemeriksaan & Servis IT Terjadwal',
        description: 'Penanganan langsung oleh teknisi lab berpengalaman dengan garansi resmi 90 hari.',
        estimatedPrice: 'Rp 100.000 - Rp 250.000',
        estimatedDuration: '1 - 3 Hari Kerja',
        problemSummary: userLatestQuery,
      },
    };
  }
}
