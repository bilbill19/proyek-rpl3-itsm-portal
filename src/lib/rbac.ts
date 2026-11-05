import { redirect } from 'next/navigation';
import { getSession } from './auth';
import { Role, UserSession } from '@/types';

// Require authenticated session
export async function requireAuth(): Promise<UserSession> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

// Require Admin role
export async function requireAdmin(): Promise<UserSession> {
  const session = await requireAuth();
  if (session.role !== 'ADMIN') {
    redirect('/dashboard');
  }
  return session;
}

// Require Customer role
export async function requireCustomer(): Promise<UserSession> {
  const session = await requireAuth();
  if (session.role !== 'CUSTOMER') {
    redirect('/admin/dashboard');
  }
  return session;
}

// Helper to check if role matches
export function hasRole(session: UserSession | null, requiredRole: Role): boolean {
  return session?.role === requiredRole;
}
