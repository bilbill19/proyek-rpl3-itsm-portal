'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Send,
  X,
  MessageCircle,
  RotateCcw,
  Sparkles,
  User,
  RefreshCw,
  AlertTriangle,
  Wrench,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMessageContent } from './ChatMessageContent';
import { useChatScroll } from '@/components/ai/use-chat-scroll';
import { parseMarkdown } from '@/lib/ai/markdown';
import { MIMO, MIKO } from '@/lib/ai/branding';
import { isServiceRelevantReply } from '@/lib/ai/service-cta';
import { emphasizeDeveloperName } from '@/lib/developer';

/**
 * Floating **Mimo — IT Service Assistant** (chatbot publik NVIDIA NIM) untuk
 * halaman Beranda — asisten percakapan & konsultasi IT tanpa login. AI
 * internal (**Miko — ITSM Smart Assistant**) berada terpisah di /dashboard/ai
 * dan /admin/ai dan tidak menggunakan komponen ini.
 *
 * Arsitektur:
 *   HomeChatbot (client) -> POST /api/ai/chat (server) -> generateNvidiaChatResponse
 *   (`@/lib/ai`) -> NVIDIA NIM -> reply (bila key kosong/gagal: Expert Engine offline).
 *
 * API key TIDAK PERNAH disentuh komponen ini; semuanya ditangani server-side.
 * Komponen ini memakai positioning `fixed`, sehingga tidak memengaruhi layout
 * Beranda sama sekali.
 */

interface LocalMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  isError?: boolean;
  retryText?: string;
  /** Provider server (untuk menentukan relevansi CTA layanan). */
  provider?: string;
  /** Rekomendasi layanan dari AI — penanda kuat relevansi servis. */
  recommendedService?: string | null;
}

/** Batas panjang input (harus sama dengan validasi server). */
const MAX_INPUT_LENGTH = 2000;
/** Jumlah riwayat yang dikirim ke server untuk konteks. */
const MAX_HISTORY = 10;

const WELCOME_MESSAGE: LocalMessage = {
  id: 'welcome',
  role: 'ASSISTANT',
  content: `Haiii! Aku **${MIMO.name}**, asisten virtual ITSM Portal. Ada masalah laptop, komputer, atau perangkat IT yang mau kamu konsultasikan?\n\nAku bisa bantu:\n- Troubleshooting komputer & laptop\n- Menjelaskan masalah dan istilah IT\n- Menjelaskan layanan serta proses servis\n- Merekomendasikan layanan yang paling tepat\n\n💡 Untuk **diagnosis mendalam** (riwayat tersimpan & rekomendasi teknisi), login lalu buka **${MIKO.label}** di dashboard melalui menu "Konsultasi AI".\n\nSilakan tuliskan keluhan atau pertanyaanmu pada kolom di bawah.`,
};

const QUICK_PROMPTS = [
  'Laptop saya sangat lambat dan sering hang',
  'Komputer sering Blue Screen (BSOD)',
  'Laptop panas dan kipas berbunyi keras',
  'Wi-Fi tidak bisa terdeteksi di laptop',
];

const INITIAL_MESSAGES: LocalMessage[] = [WELCOME_MESSAGE];

/**
 * CTA "Buat pesanan service" hanya muncul bila relevan dengan masalah servis —
 * BUKAN pada sapaan, pertanyaan identitas, informasi umum/katalog, penolakan
 * tugas, atau balasan clarify. Kebijakan dibagikan dengan dashboard melalui
 * `@/lib/ai/service-cta` agar aturannya seragam di kedua antarmuka.
 */
function shouldShowServiceCta(msg?: LocalMessage): boolean {
  if (!msg || msg.isError) return false;
  return isServiceRelevantReply(msg.content, msg.provider, msg.recommendedService);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nama event global untuk membuka chatbot dari komponen lain di halaman. */
export const HOME_CHATBOT_OPEN_EVENT = 'itsm:open-chat';

/**
 * Buka floating chatbot Beranda dari komponen lain (tombol Hero, CTA,
 * section AI, dst) tanpa navigasi dan tanpa state coupling.
 *
 * Dipanggil bersama `event.preventDefault()` pada tombol ber-`href`
 * `/#ai-assistant`, sehingga anchor tetap menjadi fallback jika JS gagal.
 */
export function openHomeChatbot(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOME_CHATBOT_OPEN_EVENT));
  }
}

export function HomeChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<LocalMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  // Auto-scroll percakapan (shared dengan Miko): pesan user → terlihat;
  // jawaban AI → tampilkan BAGIAN AWAL-nya, bukan akhir jawaban panjang.
  const { containerRef } = useChatScroll(messages);
  /**
   * Ref sinkron untuk mencegah pengiriman ganda.
   * State `isSending` baru ter-set setelah render, sehingga keydown yang datang
   * pada tick yang sama masih melihat nilai lama. Ref ini langsung berubah.
   */
  const sendingRef = useRef(false);

  // Fokus ke input saat panel dibuka
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Tutup chat dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  // Buka chat dari tombol lain di halaman ini (Hero / CTA / section AI)
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(HOME_CHATBOT_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(HOME_CHATBOT_OPEN_EVENT, handleOpen);
  }, []);

  const pushMessage = useCallback((message: LocalMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      if (isSending || sendingRef.current) return;

      const text = (overrideText ?? input).trim();

      // Input kosong -> tidak dikirim apa pun (validasi client-side).
      if (text.length === 0) {
        inputRef.current?.focus();
        return;
      }

      if (text.length > MAX_INPUT_LENGTH) {
        pushMessage({
          id: createId('err'),
          role: 'ASSISTANT',
          isError: true,
          content: `Pesan terlalu panjang (${text.length} karakter). Maksimal ${MAX_INPUT_LENGTH} karakter — mohon ringkas keluhan Anda.`,
        });
        return;
      }

      const history = messages
        .filter((m) => !m.isError)
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content }));

      const optimisticUser: LocalMessage = {
        id: createId('user'),
        role: 'USER',
        content: text,
      };

      pushMessage(optimisticUser);
      setInput('');
      sendingRef.current = true;
      setIsSending(true);

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || 'Terjadi kesalahan saat memproses pesan.');
        }

        if (!data?.reply || typeof data.reply !== 'string') {
          throw new Error('AI tidak mengembalikan jawaban. Silakan coba lagi.');
        }

        pushMessage({
          id: createId('ai'),
          role: 'ASSISTANT',
          content: data.reply,
          provider: typeof data.provider === 'string' ? data.provider : undefined,
          recommendedService:
            typeof data.recommendedService === 'string' ? data.recommendedService : null,
        });
      } catch (error: any) {
        pushMessage({
          id: createId('err'),
          role: 'ASSISTANT',
          isError: true,
          retryText: text,
          content:
            error?.message ||
            'Maaf, terjadi kendala saat menghubungi AI. Silakan coba lagi.',
        });
      } finally {
        sendingRef.current = false;
        setIsSending(false);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [input, isSending, messages, pushMessage]
  );

  const handleRetry = useCallback(
    (message: LocalMessage) => {
      if (!message.retryText || sendingRef.current) return;
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      void handleSend(message.retryText);
    },
    [handleSend]
  );

  const handleReset = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Abaikan Enter saat sedang composition (input method / IME).
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const showSuggestions = messages.length <= 1;
  const remaining = MAX_INPUT_LENGTH - input.length;
  // CTA layanan hanya bila balasan AI terakhir relevan dengan masalah servis.
  const lastAiMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'ASSISTANT' && !m.isError);
  const showServiceCta = shouldShowServiceCta(lastAiMessage);

  return (
    <>
      {/* ================================================================
          Floating Action Button
      ================================================================ */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? `Tutup chat ${MIMO.name}` : `Buka chat ${MIMO.name}`}
        aria-expanded={isOpen}
        aria-controls="itsm-home-chatbot"
        className={cn(
          'fixed bottom-5 right-4 sm:bottom-6 sm:right-6 z-[60]',
          'h-14 w-14 rounded-full flex items-center justify-center',
          'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
          'text-white shadow-xl shadow-indigo-600/40 dark:shadow-purple-900/40',
          'ring-1 ring-white/20 transition-all duration-200 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-50 dark:focus:ring-offset-slate-950'
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}

        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
        )}
      </button>

      {!isOpen && (
        <div className="hidden sm:flex fixed bottom-8 right-24 z-[60] items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold shadow-lg pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Tanya {MIMO.name}</span>
        </div>
      )}

      {/* ================================================================
          Chat Panel
      ================================================================ */}
      {isOpen && (
        <div
          id="itsm-home-chatbot"
          role="dialog"
          aria-label={MIMO.label}
          className={cn(
            'fixed z-[60] flex flex-col overflow-hidden rounded-3xl',
            'left-3 right-3 bottom-24 h-[68vh] max-h-[640px]',
            'sm:left-auto sm:right-6 sm:w-[390px] lg:w-[420px] sm:h-[560px] sm:max-h-[70vh]',
            'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800',
            'shadow-2xl shadow-slate-900/20 dark:shadow-black/60'
          )}
        >
          {/* ---------- Header ---------- */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate flex items-center gap-1.5">
                  <span className="truncate">{MIMO.label}</span>
                  <span className="text-[9px] font-mono font-bold bg-emerald-500/25 border border-emerald-300/40 text-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">
                    ONLINE
                  </span>
                </h3>
                <p className="text-[10px] text-indigo-100/90 truncate">
                  Asisten percakapan & konsultasi IT 24/7
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleReset}
                title="Mulai ulang percakapan"
                aria-label="Mulai ulang percakapan"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Tutup chat"
                aria-label="Tutup chat"
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ---------- Daftar Pesan ---------- */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 bg-slate-50 dark:bg-slate-950/60"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              /* ---------- Empty State ---------- */
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Belum ada percakapan
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tuliskan keluhan perangkat Anda dan {MIMO.name} akan
                    membantu menganalisa langkah pertama.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'USER';
                return (
                  <div
                    key={msg.id}
                    data-chat-item
                    className={cn('flex items-start gap-2', isUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isUser && (
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border',
                          msg.isError
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-500'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                        )}
                      >
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm',
                        isUser
                          ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-tr-sm'
                          : msg.isError
                            ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-tl-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                      )}
                    >
                      {msg.role !== 'USER' && !msg.isError ? (
                        // Balasan AI (Mimo) memakai shared markdown renderer yang
                        // sama dengan Miko (heading/list/tabel/italic) — konsisten
                        // antarkedua chatbot, tanpa dangerouslySetInnerHTML.
                        // Override list HANYA di scope komponen Mimo ini (Miko
                        // tidak tersentuh): padding kiri lebih lega agar bullet
                        // tidak mepet tepi bubble, jarak marker→teks proporsional,
                        // dan spasi antar-item nyaman dibaca (termasuk saat wrap).
                        // `[list-style-type:decimal]` = perbaikan scoped: utility
                        // `.list-decimal` tidak ikut ter-generate Tailwind (config
                        // content tidak mencakup src/lib) sehingga angka daftar
                        // bernomor sempat hilang oleh preflight `list-style:none`.
                        <div className="text-xs [&_ul]:pl-6 [&_ol]:pl-7 [&_ol]:[list-style-type:decimal] [&_ul>li]:pl-1.5 [&_ol>li]:pl-1 [&_ul]:space-y-1.5 [&_ol]:space-y-1.5 [&_li]:break-words [&_li]:text-left">
                          {parseMarkdown(emphasizeDeveloperName(msg.content))}
                        </div>
                      ) : (
                        <ChatMessageContent
                          content={msg.content}
                          role={msg.role}
                          isError={msg.isError}
                        />
                      )}

                      {msg.isError && msg.retryText && (
                        <button
                          type="button"
                          onClick={() => handleRetry(msg)}
                          disabled={isSending}
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Coba lagi
                        </button>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-lg bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* ---------- Indikator loading (pola identik dengan Miko:
                fade-in, avatar Bot berputar, spinner + varian dark, teks
                brand ber-regular-weight — geometri mengikuti skala Mimo) ---------- */}
            {isSending && (
              <div className="flex items-start gap-2 justify-start animate-in fade-in duration-200">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-3.5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-indigo-600 dark:text-indigo-300 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500 dark:text-indigo-400" />
                  <span className="font-semibold">
                    {MIMO.name} sedang mengetik &amp; menyiapkan jawaban...
                  </span>
                </div>
              </div>
            )}

            {/* ---------- Quick prompt / empty-state suggestions ---------- */}
            {showSuggestions && !isSending && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Contoh pertanyaan:
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void handleSend(prompt)}
                      className="group flex items-center justify-between gap-2 text-left text-[11px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    >
                      <span className="truncate">{prompt}</span>
                      <ArrowRight className="w-3 h-3 shrink-0 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------- Ajakan ke Layanan Service (hanya bila relevan) ---------- */}
          {showServiceCta && (
            <div className="shrink-0 px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Link
                href="/dashboard/orders/new"
                className="flex items-center justify-between gap-2 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-500 dark:hover:text-indigo-200 transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Wrench className="w-3.5 h-3.5 shrink-0" />
                  Butuh pemeriksaan teknisi? Buat pesanan service
                </span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </Link>
            </div>
          )}

          {/* ---------- Input Bar ---------- */}
          <div className="shrink-0 px-3.5 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
                maxLength={MAX_INPUT_LENGTH + 1}
                placeholder="Tuliskan keluhan Anda..."
                aria-label={`Tulis pesan untuk ${MIMO.name}`}
                className={cn(
                  'flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm',
                  'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                  'text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500',
                  'focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
                  'transition-all disabled:opacity-50'
                )}
              />

              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || input.trim().length === 0}
                aria-label="Kirim pesan"
                className={cn(
                  'shrink-0 h-10 w-10 rounded-2xl flex items-center justify-center',
                  'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white',
                  'shadow-md shadow-indigo-600/30 transition-all active:scale-95',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900'
                )}
              >
                {isSending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 mt-1.5">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                Enter untuk kirim • Esc untuk tutup
              </p>
              {input.length > MAX_INPUT_LENGTH - 300 && (
                <span
                  className={cn(
                    'text-[10px] font-mono shrink-0',
                    remaining < 0
                      ? 'text-rose-500 font-bold'
                      : 'text-slate-400 dark:text-slate-500'
                  )}
                >
                  {remaining}
                </span>
              )}
            </div>
          </div>

          {/* ---------- Disclaimer footer ---------- */}
          <div className="shrink-0 px-3.5 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[9px] leading-relaxed text-slate-400 dark:text-slate-500">
              Jawaban AI adalah analisa awal berdasarkan keterangan Anda, bukan
              pengganti pemeriksaan fisik oleh teknisi.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
