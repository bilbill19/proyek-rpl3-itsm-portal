import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { checkRateLimit, AI_SMART_RATE_LIMIT, AI_SMART_RATE_WINDOW_MS } from '@/lib/rate-limit';
import { generateRoleReply } from '@/lib/ai/pipeline';
import { deriveConversationTitle } from '@/lib/utils';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (bukan Edge) — wajib untuk Prisma/PostgreSQL & pipeline AI.
export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

// POST: Kirim pesan user ke percakapan dan generate balasan AI
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    // Rate limiting GENERASI AI per pelanggan terautentikasi (bukan per IP).
    // Hanya endpoint generasi AI ini yang dibatasi — login maupun transaksi
    // pesanan service TIDAK melewati pemeriksaan ini.
    if (!checkRateLimit(`ai-smart:${session.id}`, AI_SMART_RATE_LIMIT, AI_SMART_RATE_WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan AI Smart Diagnostic. Silakan tunggu sebentar lagi.' },
        { status: 429 }
      );
    }

    const conversation = await prisma.aIConversation.findUnique({
      where: { id: params.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Percakapan tidak ditemukan.' }, { status: 404 });
    }

    // Kepemilikan KETAT: hanya pemilik sesi login (customer ATAU admin) yang
    // boleh menulis ke percakapan ini — tanpa pengecualian role ADMIN.
    if (conversation.customerId !== session.id) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const userText = content.trim();

    // 1. Simpan pesan User ke Database (APA ADANYA / BERSIH — konteks database
    //    tidak pernah disimpan sebagai pesan USER).
    const userMessage = await prisma.aIMessage.create({
      data: {
        conversationId: params.id,
        role: 'USER',
        content: userText,
      },
    });

    // 2. Siapkan riwayat percakapan untuk konteks AI
    const historyForAI = conversation.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    historyForAI.push({ role: 'USER', content: userText });

    // 3. Pipeline bersama (satu implementasi untuk customer & admin):
    //    - ADMIN    → konteks operasional database (read-only, agregasi).
    //    - CUSTOMER → identitas/status pesanan/katalog/diagnosis per sesi login.
    //    Konteks database diambil FRESH untuk SETIAP pesan (read-only).
    const { reply, provider, recommendedService } = await generateRoleReply(
      session,
      userText,
      historyForAI
    );

    // 4. Simpan balasan AI ke Database
    const aiMessage = await prisma.aIMessage.create({
      data: {
        conversationId: params.id,
        role: 'ASSISTANT',
        content: reply,
      },
    });

    // 5. Update updatedAt dan judul percakapan jika masih judul default
    let updatedTitle = conversation.title;
    if (
      conversation.title === 'Konsultasi Perbaikan IT' ||
      conversation.title === 'Konsultasi Operasional IT' ||
      conversation.title === 'Konsultasi Baru' ||
      conversation.messages.length === 0
    ) {
      updatedTitle = deriveConversationTitle(userText);
    }

    await prisma.aIConversation.update({
      where: { id: params.id },
      data: {
        title: updatedTitle,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      userMessage,
      aiMessage,
      recommendedService,
      provider,
    });
  } catch (error: any) {
    console.error('Error in AI message conversation:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses pesan AI.' }, { status: 500 });
  }
}
