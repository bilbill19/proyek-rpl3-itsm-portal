import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPasswordResetToken } from '@/lib/auth';
import { resetPasswordSchema } from '@/lib/validations/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Format data reset password tidak valid';
      return NextResponse.json(
        { error: firstError, details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { token, email, password } = parsed.data;

    // Cari user di database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Pengguna tidak ditemukan atau token tidak valid.' },
        { status: 400 }
      );
    }

    // Verifikasi token terhadap password hash saat ini (mencegah token reuse)
    const verification = await verifyPasswordResetToken(token, user.password);

    if (!verification || verification.userId !== user.id || verification.email !== user.email) {
      return NextResponse.json(
        { error: 'Tautan reset kata sandi tidak valid atau telah kedaluwarsa (maksimal 15 menit). Silakan ajukan ulang.' },
        { status: 400 }
      );
    }

    // Hash kata sandi baru
    const newHashedPassword = await hashPassword(password);

    // Update password di database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
      },
    });

    return NextResponse.json(
      {
        message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Reset Password API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat memperbarui kata sandi.' },
      { status: 500 }
    );
  }
}
