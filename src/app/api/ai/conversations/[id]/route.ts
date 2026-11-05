import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
// Runtime Node.js EKSPLISIT (bukan Edge) — wajib untuk Prisma/PostgreSQL & pipeline AI.
export const runtime = 'nodejs';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET: Ambil percakapan tertentu beserta seluruh pesannya
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
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
    // boleh membaca percakapan ini — tanpa pengecualian role ADMIN, sehingga
    // riwayat Admin dan Customer tidak pernah tercampur.
    if (conversation.customerId !== session.id) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus percakapan AI
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu.' }, { status: 401 });
    }

    const conversation = await prisma.aIConversation.findUnique({
      where: { id: params.id },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Percakapan tidak ditemukan.' }, { status: 404 });
    }

    // Kepemilikan KETAT: hanya pemilik sesi login (customer ATAU admin) yang
    // boleh menghapus percakapan ini — tanpa pengecualian role ADMIN.
    if (conversation.customerId !== session.id) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    await prisma.aIConversation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Percakapan berhasil dihapus!' });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
