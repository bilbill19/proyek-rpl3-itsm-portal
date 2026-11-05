import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Format data login tidak valid', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Cari akun user berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Email atau kata sandi yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // Verifikasi hash password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email atau kata sandi yang Anda masukkan salah.' },
        { status: 401 }
      );
    }

    // Status akun: dinonaktifkan lewat Manajemen User → login DITOLAK
    // (penonaktifan diterapkan pada autentikasi, bukan sekadar label UI).
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'Akun Anda sedang dinonaktifkan. Silakan hubungi administrator ITSM Portal.' },
        { status: 403 }
      );
    }

    // Buat JWT Session Payload
    const sessionPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Rule: ADMIN diarahkan ke /admin/dashboard, CUSTOMER diarahkan ke /dashboard
    const redirectTo = user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';

    return NextResponse.json(
      {
        message: 'Login berhasil!',
        user: sessionPayload,
        redirectTo,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat proses masuk.' },
      { status: 500 }
    );
  }
}
