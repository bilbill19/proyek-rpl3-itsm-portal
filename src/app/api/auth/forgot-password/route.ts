import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/auth';
import { forgotPasswordSchema } from '@/lib/validations/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Format email tidak valid.' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Cari user di database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Keamanan: hindari email enumeration dengan tetap memberikan pesan sukses umum
      return NextResponse.json(
        {
          message: 'Jika email terdaftar, tautan reset kata sandi telah dikirim.',
        },
        { status: 200 }
      );
    }

    // Buat token reset password yang aman (Single-use, 15 menit, terikat hash password)
    const resetToken = await createPasswordResetToken(user.id, user.email, user.password);

    // Ambil origin/host untuk tautan reset (hanya untuk pengiriman email nyata).
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // KEAMANAN: TIDAK mencetak resetLink ke console.log (mencegah kebocoran via log).
    // Kanal pengiriman produksi: email ke pemilik akun (butuh provider email/SMTP).
    // TODO: Integrasikan provider email (Resend, Nodemailer, SendGrid, dll.) di sini.

    // Respons umum yang SAMA PERSIS untuk email terdaftar maupun tidak
    // terdaftar (tanpa field resetLink, tanpa indikasi keberadaan akun).
    return NextResponse.json(
      {
        message: 'Jika email terdaftar, tautan reset kata sandi telah dikirim.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Forgot Password API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat memproses permintaan reset kata sandi.' },
      { status: 500 }
    );
  }
}
