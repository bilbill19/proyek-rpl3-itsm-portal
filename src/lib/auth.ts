import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import prisma from './prisma';
import { UserSession, Role } from '@/types';

// KEAMANAN: TIDAK ADA secret fallback hardcoded. Tanpa JWT_SECRET,
// sesi dinonaktifkan (fail-closed) — bukan ditandatangani dengan secret
// publik yang tertanam di kode dan bisa dipalsukan siapa pun.
const SECRET_KEY = process.env.JWT_SECRET;
const key = SECRET_KEY ? new TextEncoder().encode(SECRET_KEY) : null;

/** Ambil key; bila env belum diisi, gagal keras (jangan diam-diam lemah). */
function requireJwtKey(): Uint8Array {
  if (!key) {
    throw new Error(
      'JWT_SECRET belum dikonfigurasi. Isi variabel JWT_SECRET di .env.local (lihat .env.example) sebelum menjalankan autentikasi.'
    );
  }
  return key;
}

const COOKIE_NAME = 'itsm_session_token';

// Hash Password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare Password
export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

// Sign JWT Session Token (7 days)
export async function createSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(requireJwtKey());
}

// Verify JWT Session Token
export async function verifySessionToken(token: string): Promise<UserSession | null> {
  if (!key) return null; // fail-closed: tanpa JWT_SECRET tidak ada sesi valid
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as UserSession;
  } catch (error) {
    return null;
  }
}

// Create Secure Password Reset Token (Valid for 15 minutes, single-use tied to current password hash)
export async function createPasswordResetToken(userId: string, email: string, passwordHash: string): Promise<string> {
  requireJwtKey(); // gagal keras bila JWT_SECRET belum dikonfigurasi
  const resetSecret = new TextEncoder().encode(`${SECRET_KEY}_${passwordHash.slice(-10)}`);
  return new SignJWT({ sub: userId, email, purpose: 'password-reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(resetSecret);
}

// Verify Secure Password Reset Token
export async function verifyPasswordResetToken(token: string, passwordHash: string): Promise<{ userId: string; email: string } | null> {
  if (!SECRET_KEY) return null; // fail-closed: tanpa JWT_SECRET tidak ada token valid
  try {
    const resetSecret = new TextEncoder().encode(`${SECRET_KEY}_${passwordHash.slice(-10)}`);
    const { payload } = await jwtVerify(token, resetSecret, {
      algorithms: ['HS256'],
    });
    if (payload.purpose !== 'password-reset' || !payload.sub || !payload.email) {
      return null;
    }
    return { userId: payload.sub as string, email: payload.email as string };
  } catch (error) {
    return null;
  }
}

// Get Current Logged In Session from Cookies in Server Components / API Routes
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.id) return null;

  // REFRESH dari database — bukan sekadar mempercayai klaim JWT (7 hari):
  //   1) Perubahan nama/email/role lewat Manajemen User langsung berlaku
  //      (termasuk untuk jawaban Miko) tanpa menunggu sesi lama kedaluwarsa.
  //   2) Akun nonaktif (isActive=false) atau terhapus → sesi lama TIDAK
  //      berlaku lagi; penonaktifan benar-benar memblokir akses.
  const fresh = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!fresh || !fresh.isActive) return null;

  return { id: fresh.id, name: fresh.name, email: fresh.email, role: fresh.role };
}

// Set Session Cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear Session Cookie (Logout)
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
