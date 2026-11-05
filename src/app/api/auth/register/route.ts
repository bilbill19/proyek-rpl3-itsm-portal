import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth';
import { registerSchema } from '@/lib/validations/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Validasi formulir gagal';
      return NextResponse.json(
        { error: firstError, details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { name, email, password, phone } = parsed.data;

    // Cek apakah email sudah terdaftar
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email ini sudah terdaftar. Silakan login ke akun Anda.' },
        { status: 409 }
      );
    }

    // Hash password & buat user baru (Role default: CUSTOMER)
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Buat JWT Token & Set session cookie
    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        message: 'Pendaftaran akun customer berhasil!',
        user,
        redirectTo: '/dashboard',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan sistem saat pendaftaran.' },
      { status: 500 }
    );
  }
}
