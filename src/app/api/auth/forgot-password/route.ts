import { NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/lib/validations/auth';
export async function POST(request: Request) {
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 });
  // Identical for registered/unregistered addresses. Never return a reset token.
  return NextResponse.json({ error: 'Pemulihan email belum tersedia. Hubungi administrator untuk bantuan akun.' }, { status: 503 });
}
