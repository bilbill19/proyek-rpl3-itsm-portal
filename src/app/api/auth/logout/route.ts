import { NextResponse } from 'next/server';
import { clearSessionCookie, getSession } from '@/lib/auth';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ message: 'Berhasil logout' }, { status: 200 });
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user: session }, { status: 200 });
}
