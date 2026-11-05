import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { MikoChat } from '@/components/ai/MikoChat';
import { Bot, Sparkles, ShieldCheck } from 'lucide-react';
import { MIKO, MIKO_ADMIN_GREETING } from '@/lib/ai/branding';

export const dynamic = 'force-dynamic';

export default async function AdminAIPage() {
  const session = await requireAdmin();

  // Riwayat percakapan ADMIN — dipisah ketat dari riwayat customer mana pun
  // (customerId = id admin yang sedang login; diverifikasi juga di server API).
  let initialConversations: any[] = [];
  try {
    initialConversations = await prisma.aIConversation.findMany({
      where: { customerId: session.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching admin AI conversations:', error);
  }

  // Serialize dates to ISO strings for Next.js Client Component props
  const serializedConversations = initialConversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: conv.messages.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
    _count: conv._count,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header Banner — sm:flex-wrap: label badge turun ke baris baru
          pada layar sempit, bukan terpotong di tepi viewport. */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{MIKO.label} &mdash; Asisten Operasional Admin</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span>Miko Admin Assistant</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {MIKO_ADMIN_GREETING}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold shrink-0 self-start sm:self-center">
          <ShieldCheck className="w-4 h-4" />
          Data operasional real-time dari database (read-only)
        </div>
      </div>

      {/* Main Interactive Chat Area — komponen UI sama persis dengan Miko Customer */}
      <MikoChat mode="admin" initialConversations={serializedConversations} />
    </div>
  );
}
