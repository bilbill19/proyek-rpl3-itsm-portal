import React from 'react';
import { requireCustomer } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { MikoChat } from '@/components/ai/MikoChat';
import { Bot, Sparkles } from 'lucide-react';
import { MIKO } from '@/lib/ai/branding';

export const dynamic = 'force-dynamic';

export default async function AIConsultationPage() {
  const session = await requireCustomer();

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
    console.error('Error fetching initial AI conversations:', error);
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
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{MIKO.label} &mdash; Konsultasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Bot className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <span>Konsultasi Masalah IT & Komputer</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Ceritakan keluhan atau gejala kerusakan perangkat Anda untuk diagnosa awal, troubleshooting mandiri, dan rekomendasi layanan teknisi lab.
          </p>
        </div>
      </div>

      {/* Main Interactive Chat Area */}
      <MikoChat mode="customer" initialConversations={serializedConversations} />
    </div>
  );
}
