import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkRateLimit, AI_SMART_RATE_LIMIT, AI_SMART_RATE_WINDOW_MS } from '@/lib/rate-limit';
import { generateRoleReply } from '@/lib/ai/pipeline';
import { deriveConversationTitle } from '@/lib/utils';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (bukan Edge) — wajib untuk Prisma/PostgreSQL & pipeline AI.
export const runtime = 'nodejs';

// Judul default percakapan baru per konteks (customer vs admin).
function defaultConversationTitle(role: string): string {
  return role === 'ADMIN' ? 'Konsultasi Operasional IT' : 'Konsultasi Perbaikan IT';
}

// GET: Ambil daftar riwayat percakapan AI milik sesi login
// (customer melihat miliknya sendiri; admin melihat miliknya sendiri —
//  dipisah ketat berdasarkan customerId, tanpa pengecualian role).
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const conversations = await prisma.aIConversation.findMany({
      where: { customerId: session.id },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Error fetching AI conversations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Buat percakapan AI baru (milik sesi login)
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    // Rate limiting GENERASI AI per pelanggan terautentikasi (bukan per IP).
    // Hanya endpoint ini yang dibatasi — login, registrasi, dan transaksi
    // pesanan service TIDAK melewati pemeriksaan ini.
    if (!checkRateLimit(`ai-smart:${session.id}`, AI_SMART_RATE_LIMIT, AI_SMART_RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan AI Smart Diagnostic. Silakan tunggu sebentar lagi.' },
        { status: 429 }
      );
    }

    const parsed = z.object({ title: z.string().trim().min(1).max(120).optional(), firstMessage: z.string().trim().min(1).max(2000).optional() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Judul atau pesan tidak valid (maksimal 2000 karakter).' }, { status: 400 });
    const { title, firstMessage } = parsed.data;

    let convTitle = title || defaultConversationTitle(session.role);

    if (firstMessage && typeof firstMessage === 'string') {
      // Potong di batas kata dengan elipsis rapi (bukan substring mentah
      // yang memotong tengah kata — "siapa nam...").
      convTitle = deriveConversationTitle(firstMessage);
    }

    // 1. Buat percakapan baru (customerId = pemilik sesi login)
    const conversation = await prisma.aIConversation.create({
      data: {
        customerId: session.id,
        title: convTitle,
      },
    });

    // 2. Jika ada pesan awal yang dikirimkan bersamaan
    let provider: string = 'unknown';
    if (firstMessage && typeof firstMessage === 'string' && firstMessage.trim().length > 0) {
      const userText = firstMessage.trim();

      // Simpan pesan user APA ADANYA (BERSIH). Konteks database TIDAK PERNAH
      // disimpan sebagai pesan USER di riwayat chat.
      await prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: userText,
        },
      });

      // Pipeline bersama (satu implementasi untuk customer & admin):
      // ADMIN → konteks operasional database; CUSTOMER → diagnosis per sesi.
      const result = await generateRoleReply(session, userText, [
        { role: 'USER', content: userText },
      ]);
      provider = result.provider;

      // Simpan balasan AI
      await prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: result.reply,
        },
      });
    }

    // Ambil percakapan lengkap dengan pesan
    const fullConversation = await prisma.aIConversation.findUnique({
      where: { id: conversation.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(
      { conversation: fullConversation, provider },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating AI conversation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
