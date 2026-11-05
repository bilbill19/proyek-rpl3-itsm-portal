'use client';

/**
 * MikoChat — komponen UI chat Miko yang BERSAMA (reusable) untuk:
 *  - Mode "customer" → /dashboard/ai (Miko Customer)
 *  - Mode "admin"    → /admin/ai    (Miko Admin)
 *
 * Satu implementasi UI (riwayat percakapan + panel chat), tanpa duplikasi.
 * Perbedaan role HANYA pada konfigurasi tampilan (prompt cepat, placeholder,
 * CTA) — pipeline & data tetap dipisah di server:
 *  - Endpoint riwayat: /api/ai/conversations* (validasi kepemilikan per sesi).
 *  - Customer A / Customer B / Admin masing-masing hanya melihat riwayatnya
 *    sendiri (dicek server-side berdasarkan customerId = pemilik sesi login).
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useChatScroll } from '@/components/ai/use-chat-scroll';
import {
  Bot,
  Plus,
  Send,
  Trash2,
  Sparkles,
  MessageSquare,
  Wrench,
  RefreshCw,
  User,
  ArrowRight,
  Menu,
  X,
  Users,
  ClipboardList,
  Package,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDate, deriveConversationTitle } from '@/lib/utils';
import { parseMarkdown } from '@/lib/ai/markdown';
import { MIKO, MIKO_ADMIN_GREETING } from '@/lib/ai/branding';
import { isServiceRelevantReply } from '@/lib/ai/service-cta';
import { emphasizeDeveloperName } from '@/lib/developer';

export interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: MessageItem[];
  _count?: { messages: number };
}

export interface MessageItem {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

export type MikoChatMode = 'customer' | 'admin';

interface QuickPrompt {
  /** Teks chip singkat yang ditampilkan. */
  label: string;
  /** Pertanyaan lengkap yang dikirim saat chip diklik. */
  prompt: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface MikoModeConfig {
  /** Chip rekomendasi (ringkas) — hanya tampil pada percakapan kosong. */
  quickPrompts: QuickPrompt[];
  placeholder: string;
  headerSubtitle: string;
  emptyTitle: string;
  emptyDescription: React.ReactNode;
  newConversationTitle: string;
  /** Tampilkan tombol CTA pemesanan service di header (khusus customer). */
  showOrderCta: boolean;
  /** Tampilkan kartu CTA "Pesan Service" di balasan AI (khusus customer). */
  showServiceCta: boolean;
}

// 4 chip ringkas Miko Customer — label pendek, tetapi mengirim pertanyaan
// troubleshooting lengkap yang sesuai (lihat field `prompt`).
const CUSTOMER_QUICK_PROMPTS: QuickPrompt[] = [
  {
    label: 'Laptop lemot',
    prompt:
      'Laptop saya sangat lambat saat membuka aplikasi dan booting. Apa penyebab dan langkah pemeriksaannya?',
  },
  {
    label: 'Laptop cepat panas',
    prompt:
      'Laptop saya cepat panas dan kipas berbunyi keras. Apa penyebab dan cara mengatasinya?',
  },
  {
    label: 'Wi-Fi bermasalah',
    prompt:
      'Laptop saya tidak bisa terhubung ke Wi-Fi. Bagaimana langkah troubleshooting-nya?',
  },
  {
    label: 'Blue Screen (BSOD)',
    prompt:
      'Laptop saya sering mengalami Blue Screen (BSOD) dan restart sendiri. Apa yang harus diperiksa?',
  },
];

const ADMIN_QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'Total customer', prompt: 'Berapa total customer?', icon: Users },
  { label: 'Statistik pesanan', prompt: 'Bagaimana statistik pesanan bulan ini?', icon: ClipboardList },
  { label: 'Layanan populer', prompt: 'Layanan apa yang paling populer?', icon: Wrench },
  {
    label: 'Stok menipis',
    prompt: 'Apa saja inventory yang stoknya menipis?',
    icon: Package,
  },
  {
    label: 'Nilai servis bulan ini',
    prompt: 'Bagaimana ringkasan nilai servis bulan ini?',
    icon: BarChart3,
  },
  {
    label: 'Ringkasan hari ini',
    prompt: 'Tampilkan ringkasan operasional toko hari ini',
    icon: Layers,
  },
];

const MODE_CONFIG: Record<MikoChatMode, MikoModeConfig> = {
  customer: {
    quickPrompts: CUSTOMER_QUICK_PROMPTS,
    placeholder: 'Ketik keluhan kerusakan komputer (cth: Laptop saya sangat lambat)...',
    headerSubtitle: 'Konsultasi 24/7 Diagnostik & Solusi Perbaikan IT',
    emptyTitle: 'Mulai Konsultasi Masalah Komputer',
    emptyDescription: (
      <>
        <span className="font-semibold text-slate-700 dark:text-slate-300">{MIKO.greeting}</span>{' '}
        Pilih salah satu contoh kendala teknis di bawah ini atau ketikkan langsung gejala
        kerusakan perangkat Anda pada kolom chat.
      </>
    ),
    newConversationTitle: 'Konsultasi Perbaikan IT',
    showOrderCta: true,
    showServiceCta: true,
  },
  admin: {
    quickPrompts: ADMIN_QUICK_PROMPTS,
    placeholder: 'Tanyakan statistik customer, pesanan, inventory, layanan, atau finansial...',
    headerSubtitle: 'Asisten operasional khusus Administrator ITSM Portal',
    emptyTitle: 'Mulai Konsultasi Operasional',
    emptyDescription: (
      <>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {MIKO_ADMIN_GREETING}
        </span>{' '}
        Tanyakan statistik customer, pesanan, inventory dengan stok menipis, layanan populer,
        atau ringkasan finansial workshop.
      </>
    ),
    newConversationTitle: 'Konsultasi Operasional IT',
    showOrderCta: false,
    showServiceCta: false,
  },
};

interface MikoChatProps {
  mode: MikoChatMode;
  initialConversations: ConversationItem[];
  /**
   * Tinggi container grid. Default 'h-[720px]' (tampilan halaman penuh
   * /admin/ai & /dashboard/ai — TIDAK berubah). Panel floating bubble
   * memakai 'h-full' agar mengikuti tinggi panel induknya.
   */
  heightClass?: string;
  /**
   * Mode tertanam (floating bubble): grid tetap 1 kolom di semua lebar,
   * riwayat dibuka lewat tombol (overlay) — mencegah kolom sempit di panel
   * kecil. Halaman penuh memakai default (false) sehingga tampilan lama utuh.
   */
  embedded?: boolean;
}

export function MikoChat({
  mode,
  initialConversations,
  heightClass = 'h-[720px]',
  embedded = false,
}: MikoChatProps) {
  const config = MODE_CONFIG[mode];
  const isAdmin = mode === 'admin';

  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    initialConversations.length > 0 ? initialConversations[0].id : null
  );

  const [messages, setMessages] = useState<MessageItem[]>(
    initialConversations.length > 0 && initialConversations[0].messages
      ? initialConversations[0].messages
      : []
  );

  const [inputMessage, setInputMessage] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Ref sinkron untuk menutup race condition klik/tombol Kirim ganda:
  // state React ter-update setelah render, ref langsung berlaku di tick itu juga.
  const sendingRef = useRef(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Auto-scroll percakapan (shared dengan Mimo): pesan user → pesan user
  // terlihat; jawaban AI → tampilkan BAGIAN AWAL jawaban (bukan akhir jawaban
  // panjang); pengguna yang sedang membaca ke atas tidak diganggu.
  // resetKey = activeConvId: ganti percakapan me-reset posisi baca lama.
  const { containerRef } = useChatScroll(messages, activeConvId);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    // If active conversation already has loaded messages in state
    const existing = conversations.find((c) => c.id === activeConvId);
    if (existing?.messages && existing.messages.length > 0) {
      setMessages(existing.messages);
    }

    async function loadMessages() {
      setIsLoadingMessages(true);
      try {
        const res = await fetch(`/api/ai/conversations/${activeConvId}`);
        const data = await res.json();
        if (res.ok && data.conversation?.messages) {
          setMessages(data.conversation.messages);
          // Update conversation cache in list
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConvId ? { ...c, messages: data.conversation.messages } : c
            )
          );
        }
      } catch (err) {
        console.error('Error loading conversation messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    }

    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId]);

  // Create new conversation
  const handleCreateNewConversation = async (initialQuery?: string) => {
    setIsCreatingNew(true);
    try {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: initialQuery
            ? initialQuery.length > 35
              ? initialQuery.substring(0, 32) + '...'
              : initialQuery
            : config.newConversationTitle,
          firstMessage: initialQuery || '',
        }),
      });

      const data = await res.json();
      if (res.ok && data.conversation) {
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveConvId(data.conversation.id);
        if (data.conversation.messages) {
          setMessages(data.conversation.messages);
        }
        setShowMobileSidebar(false);
      }
    } catch (err) {
      console.error('Error creating new conversation:', err);
    } finally {
      setIsCreatingNew(false);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConvId === id) {
          const remaining = conversations.filter((c) => c.id !== id);
          setActiveConvId(remaining.length > 0 ? remaining[0].id : null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending || sendingRef.current) return;

    // Scroll pesan user ke tampilan ditangani otomatis oleh useChatScroll
    // ketika array `messages` bertambah pesan USER.

    // If no active conversation, create one with first message
    if (!activeConvId) {
      setInputMessage('');
      await handleCreateNewConversation(text);
      return;
    }

    // Optimistically add user message
    const tempUserMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage('');
    setIsSending(true);
    sendingRef.current = true;

    try {
      const res = await fetch(`/api/ai/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      // Parse body dengan aman: respons non-JSON (mis. halaman error saat
      // proses dev server hang/restart) tidak boleh melempar SyntaxError yang
      // ujungnya tampil menyesatkan sebagai "kendala AI" kepada user.
      let data: {
        userMessage?: MessageItem;
        aiMessage?: MessageItem;
        recommendedService?: unknown;
        error?: string;
      } | null = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      if (!res.ok || !data || !data.userMessage || !data.aiMessage) {
        // Peta status HTTP → pesan jujur & spesifik: 429 = rate limit,
        // 401 = sesi berakhir, 5xx = server bermasalah (bukan "AI error").
        const friendly =
          res.status === 429
            ? 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu sebentar lalu kirim ulang.'
            : res.status === 401
              ? 'Sesi Anda telah berakhir. Silakan login kembali.'
              : res.status >= 500
                ? 'Server sedang bermasalah saat memproses permintaan. Silakan coba lagi.'
                : 'Permintaan tidak dapat diproses. Silakan coba lagi.';
        throw new Error(data && typeof data.error === 'string' && data.error ? data.error : friendly);
      }

      // Replace temp message with confirmed response
      const confirmedUser: MessageItem = data.userMessage;
      const confirmedAI: MessageItem = data.aiMessage;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        confirmedUser,
        confirmedAI,
      ]);

      // Update conversation title in list if applicable
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                title:
                  c.title === config.newConversationTitle ||
                  c.title === 'Konsultasi Perbaikan IT' ||
                  c.title === 'Konsultasi Baru'
                    ? deriveConversationTitle(text)
                    : c.title,
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      // Galat jaringan (server mati/hang/restart) BUKAN galat AI — jangan
      // menyebutnya "kendala memproses jawaban AI". Galat lain memakai pesan
      // jujur dari server (mis. rate limit / sesi berakhir).
      const isNetworkError = err instanceof TypeError;
      const raw = err instanceof Error && err.message ? err.message : 'kesalahan tidak diketahui';
      const content = isNetworkError
        ? 'Maaf, tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba kembali.'
        : `Maaf, ${raw}${raw.trim().endsWith('.') ? '' : '.'}`;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'ASSISTANT',
          content,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  // Helper to extract a short problem snippet for prefilling order form
  const getProblemSnippet = (content: string) => {
    const userMsgs = messages.filter((m) => m.role === 'USER');
    if (userMsgs.length > 0) {
      return userMsgs[userMsgs.length - 1].content;
    }
    return content.substring(0, 80);
  };

  // Format AI Message using shared markdown parser (menghasilkan React
  // elements — TANPA dangerouslySetInnerHTML, aman dari HTML/XSS mentah).
  const renderMessageContent = (content: string, role: string) => {
    if (role === 'USER') {
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>;
    }

    // Data untuk kartu aksi "Pesan Service" pada tiap balasan AI (khusus mode customer).
    const userProblem = getProblemSnippet(content);

    // Kartu aksi "Pesan Service" hanya bila balasan ini relevan dengan masalah
    // servis/diagnosis — bukan identitas, sapaan, katalog, penolakan, clarify.
    const showServiceCta = config.showServiceCta && isServiceRelevantReply(content);

    return (
      <div className="space-y-3 leading-relaxed text-xs sm:text-sm">
        {/* emphasizeDeveloperName: respons identitas LAMA yang tersimpan polos
            (tanpa ** **) ikut tampil bold — tanpa mengubah data historis. */}
        {parseMarkdown(emphasizeDeveloperName(content))}

        {/* Action Button: Pesan Service Card (relevan servis saja, mode customer) */}
        {showServiceCta && (
          <div className="pt-3 mt-4 border-t border-slate-200 rounded-2xl bg-slate-50 p-3.5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 dark:border-slate-800/90 dark:bg-slate-900/60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Wrench className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Butuh Penanganan Teknisi Lab?</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Buat pesanan servis resmi untuk mendapatkan nomor tiket & garansi pengerjaan 90
                hari.
              </p>
            </div>

            <Link
              href={`/dashboard/orders/new?problem=${encodeURIComponent(userProblem)}`}
              className="shrink-0 w-full sm:w-auto"
            >
              <Button
                size="sm"
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-md shadow-indigo-600/30 text-xs flex items-center justify-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Pesan Service</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  return (
    <div
      className={`${
        embedded
          ? 'flex flex-col gap-4'
          : 'grid grid-cols-1 lg:grid-cols-12 gap-6'
      } ${heightClass} relative`}
    >
      {/* Mobile Toggle Button (halaman penuh) — mode embedded memakai tombol
          riwayat di header chat agar hemat tinggi panel */}
      <div
        className={`${
          embedded ? 'hidden' : 'lg:hidden'
        } col-span-1 flex items-center justify-between bg-white border border-slate-200 p-3 rounded-2xl dark:bg-slate-900/90 dark:border-slate-800`}
      >
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"
        >
          {showMobileSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>{showMobileSidebar ? 'Tutup Riwayat' : 'Buka Riwayat Konsultasi'}</span>
        </button>
        <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
          {conversations.length} Percakapan
        </span>
      </div>

      {/* Left 4 Cols: Conversation History Sidebar */}
      <div
        className={`${embedded ? 'col-span-1' : 'lg:col-span-4'} flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl dark:bg-slate-900/90 dark:border-slate-800 ${
          showMobileSidebar
            ? 'fixed inset-4 z-50 bg-white flex dark:bg-slate-950'
            : embedded
              ? 'hidden'
              : 'hidden lg:flex'
        }`}
      >
        {/* Top Action Bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between gap-2 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider truncate">
              Riwayat Konsultasi
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showMobileSidebar && (
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <Button
              size="sm"
              onClick={() => handleCreateNewConversation()}
              disabled={isCreatingNew}
              className="text-xs bg-indigo-600 hover:bg-indigo-500"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Baru</span>
            </Button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-700" />
              <p className="font-semibold text-slate-600 dark:text-slate-400">
                Belum ada riwayat konsultasi.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-600">
                Klik tombol &ldquo;Baru&rdquo; atau ajukan pertanyaan untuk memulai sesi diagnosa.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const isDeleting = deleteConfirmId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setShowMobileSidebar(false);
                  }}
                  className={`p-3.5 rounded-2xl cursor-pointer transition-all flex items-start justify-between gap-2 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-400/60 text-slate-900 shadow-md shadow-indigo-600/10 dark:from-indigo-950/60 dark:to-purple-950/40 dark:border-indigo-500/50 dark:text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-950/40 dark:border-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="overflow-hidden space-y-1 flex-1 min-w-0">
                    <p
                      className={`text-xs font-bold truncate ${
                        isActive
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {conv.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>{formatDate(conv.updatedAt || conv.createdAt)}</span>
                      {conv._count?.messages !== undefined && (
                        <span>• {conv._count.messages} pesan</span>
                      )}
                    </div>
                  </div>

                  {isDeleting ? (
                    <div
                      className="flex items-center gap-1 z-10 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleDeleteConversation(conv.id)}
                        className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 transition-colors"
                      >
                        Hapus
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded bg-slate-200 text-slate-700 text-[10px] hover:bg-slate-300 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(conv.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0 dark:text-slate-500 dark:hover:text-rose-400"
                      title="Hapus Percakapan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right 8 Cols: Chat Conversation Box */}
      <div className={`${embedded ? 'flex-1 min-h-0' : 'lg:col-span-8 h-full'} flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl dark:bg-slate-900/90 dark:border-slate-800`}>
        {/* Chat Header — baris 1: avatar + judul (flex, tanpa max-w tetap)
            + status Online + aksi; baris 2: subjudul lebar penuh.
            Perbaikan: judul tidak lagi terpotong sempit ("laptop sa...") pada
            panel floating 375px, status Online tidak terdesak, dan tombol
            "Pesan Service" tetap tampil (ikon) di layar kecil. */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-white space-y-1.5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="flex-1 min-w-0 flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              <span className="truncate">{activeConversation?.title || MIKO.label}</span>
              {/* Badge Online: di halaman penuh menempel judul; pada panel
                  floating (embedded) dipindah ke baris subjudul agar judul
                  memperoleh lebar penuh (375px aman tanpa terpotong sempit). */}
              {!embedded && (
                <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                  ● Online
                </span>
              )}
            </h2>

            {/* Tombol riwayat (khusus mode embedded/floating bubble) — overlay */}
            {embedded && (
              <button
                type="button"
                onClick={() => setShowMobileSidebar(true)}
                aria-label="Buka riwayat konsultasi"
                className="shrink-0 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {config.showOrderCta ? (
              <Link href="/dashboard/orders/new" className="shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label="Pesan Service"
                  className="bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-600/10 dark:border-indigo-500/30 dark:hover:bg-indigo-600/20 dark:text-indigo-300"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  {/* Panel floating (embedded) selalu ikon-saja: lebar panel
                      maks 430px tak terpengaruh viewport — teks penuh hanya
                      untuk halaman penuh di layar sm ke atas. */}
                  <span className={embedded ? 'hidden' : 'hidden sm:inline'}>
                    Pesan Service
                  </span>
                </Button>
              </Link>
            ) : (
              <Link href="/admin/orders" className="shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label="Kelola Tiket"
                  className="bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold dark:bg-indigo-600/10 dark:border-indigo-500/30 dark:hover:bg-indigo-600/20 dark:text-indigo-300"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className={embedded ? 'hidden' : 'hidden sm:inline'}>
                    Kelola Tiket
                  </span>
                </Button>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="truncate pl-11 sm:pl-[52px] flex-1 min-w-0">{config.headerSubtitle}</p>
            {embedded && (
              <span className="text-[10px] font-mono font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                ● Online
              </span>
            )}
          </div>
        </div>

        {/* Chat Messages Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50 dark:bg-transparent"
        >
          {messages.length === 0 && !isLoadingMessages ? (
            <div className="text-center py-10 space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 mx-auto shadow-inner dark:bg-purple-600/10 dark:border-purple-500/20 dark:text-purple-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {config.emptyTitle}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {config.emptyDescription}
                </p>
              </div>

              {/* Chip rekomendasi — hanya tampil pada percakapan baru/kosong;
                  wrap responsif, tak menghalangi input (berada di area pesan). */}
              <div className="flex flex-wrap justify-center gap-2 pt-3 max-w-lg mx-auto">
                {config.quickPrompts.map((q, idx) => {
                  const PromptIcon = q.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q.prompt)}
                      disabled={isSending}
                      className="px-3.5 py-2 rounded-2xl bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-xs text-slate-700 hover:text-purple-700 transition-all inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50 dark:bg-slate-950/80 dark:hover:bg-purple-950/40 dark:border-slate-800 dark:hover:border-purple-500/40 dark:text-slate-300 dark:hover:text-white"
                    >
                      {PromptIcon && (
                        <PromptIcon className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
                      )}
                      <span className="whitespace-nowrap">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'USER';
              return (
                <div
                  key={msg.id}
                  data-chat-item
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0 mt-0.5 dark:bg-purple-600/20 dark:border-purple-500/30 dark:text-purple-300">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-3xl p-4 sm:p-5 shadow-lg ${
                      isUser
                        ? 'bg-purple-100 text-purple-950 border border-purple-200 rounded-tr-sm dark:bg-gradient-to-tr dark:from-indigo-600 dark:to-indigo-500 dark:text-white dark:border-transparent dark:shadow-indigo-600/20'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm dark:bg-slate-950/90 dark:border-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {renderMessageContent(msg.content, msg.role)}
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Loading / Typing indicator */}
          {isSending && (
            <div className="flex items-start gap-3 justify-start animate-in fade-in duration-200">
              <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0 dark:bg-purple-600/20 dark:border-purple-500/30 dark:text-purple-300">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-4 rounded-3xl rounded-tl-sm bg-white border border-slate-200 text-purple-600 text-xs flex items-center gap-2.5 dark:bg-slate-950/90 dark:border-slate-800 dark:text-purple-300">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500 dark:text-purple-400" />
                <span className="font-semibold">
                  {MIKO.name} sedang menganalisa masalah & menyiapkan jawaban...
                </span>
              </div>
            </div>
          )}

          {isLoadingMessages && messages.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-center py-6">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Memuat riwayat percakapan...</span>
            </div>
          )}
        </div>

        {/* Input Bar — teks input text-sm (lebih terbaca dari text-xs lama);
            padding lebih rapat di layar kecil agar area pesan lega */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center gap-2 dark:border-slate-800 dark:bg-slate-950/80">
          <input
            type="text"
            placeholder={config.placeholder}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isSending}
            aria-label="Kolom pesan untuk Miko"
            className="flex-1 px-4 py-3 rounded-2xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700/80 dark:text-white dark:placeholder-slate-500"
          />

          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isSending}
            aria-label="Kirim pesan"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-4 sm:px-5 py-3 rounded-2xl shadow-lg shadow-purple-600/30 text-xs sm:text-sm font-bold shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Kirim</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
