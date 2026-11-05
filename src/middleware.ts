import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// KEAMANAN: tanpa JWT_SECRET, semua permintaan dianggap TANPA SESI
// (fail-closed ke halaman login) — tidak ada secret fallback hardcoded.
const SECRET_KEY = process.env.JWT_SECRET;
const key = SECRET_KEY ? new TextEncoder().encode(SECRET_KEY) : null;
const COOKIE_NAME = 'itsm_session_token';

interface SessionPayload {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
}

async function verifyToken(token: string): Promise<SessionPayload | null> {
  if (!key) return null; // fail-closed: tanpa JWT_SECRET semua dianggap tamu
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  const session = token ? await verifyToken(token) : null;

  const isAdminRoute = pathname.startsWith('/admin');
  const isCustomerRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/customer');
  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  // 1. Alias redirect: /customer/dashboard -> /dashboard
  if (pathname === '/customer/dashboard' || pathname === '/customer') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 2. Tamu (Guest) sudah login mencoba akses rute login/register/forgot/reset -> redirect ke dashboard masing-masing
  if (isAuthRoute && session) {
    if (session.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 3. Proteksi Rute Admin (/admin/*)
  if (isAdminRoute) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role Guard: Customer DILARANG mengakses area Admin
    if (session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 4. Proteksi Rute Customer (/dashboard/*)
  if (isCustomerRoute) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Role Guard: Admin DILARANG mengakses area Customer
    if (session.role !== 'CUSTOMER') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/customer/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
};
