import React from 'react';
import Link from 'next/link';
import { User, Mail, Phone, Shield, Calendar, Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { requireCustomer } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { WhatsAppPrefsCard } from '@/components/notifications/WhatsAppPrefsCard';

export const dynamic = 'force-dynamic';

export default async function CustomerProfilePage() {
  const session = await requireCustomer();

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Profil Pelanggan</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Informasi akun dan data kontak untuk verifikasi pesanan servis Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col: Avatar & Role Card */}
        <Card className="border-slate-200 dark:border-slate-800 text-center p-6 space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black mx-auto shadow-xl shadow-indigo-600/30">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">{user.email}</p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" /> Akun Terverifikasi
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-left text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tipe Akun:</span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{user.role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Bergabung:</span>
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{formatDate(user.createdAt)}</span>
            </div>
          </div>
        </Card>

        {/* Right 2 Cols: Form Info */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Informasi Pribadi
              </CardTitle>
              <CardDescription>Data yang digunakan teknisi untuk konfirmasi kedatangan & update status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-slate-700 dark:text-slate-400 font-medium">Nama Lengkap</label>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold">
                  {user.name}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-700 dark:text-slate-400 font-medium">Alamat Email</label>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  {user.email}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-slate-700 dark:text-slate-400 font-medium">Nomor WhatsApp / Telepon</label>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  {user.phone || '-'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Keamanan & Password
              </CardTitle>
              <CardDescription>Password dienkripsi secara aman dengan algoritma bcrypt</CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-3">
              <p>
                Untuk mengubah password akun Anda, gunakan fitur reset password atau hubungi tim customer service kami.
              </p>
              <Link href="/forgot-password">
                <Button size="sm" variant="secondary" className="text-xs">
                  Ubah Password
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* P7 — Preferensi notifikasi & WhatsApp (opt-in/out + nomor tersimpan) */}
          <WhatsAppPrefsCard />
        </div>
      </div>
    </div>
  );
}
