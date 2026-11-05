'use client';

/**
 * AdminUsersManager — tabel interaktif Manajemen User (Admin only).
 *
 * Data awal dari server (Prisma); mutasi lewat API /api/admin/users
 * (bcrypt, email unik, guard: nonaktif-sendiri & Admin-aktif-terakhir).
 * Kolom password TIDAK PERNAH ada di state maupun tampilan.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  UserPlus,
  Pencil,
  Ban,
  CheckCircle2,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'CUSTOMER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminUsersManagerProps {
  initialUsers: UserRow[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  activeAdmins: number;
  currentAdminId: string;
  filters: { q: string; role: 'ALL' | 'ADMIN' | 'CUSTOMER'; status: 'ALL' | 'ACTIVE' | 'INACTIVE' };
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'CUSTOMER';
  phone: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', password: '', role: 'CUSTOMER', phone: '' };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function AdminUsersManager({
  initialUsers,
  total,
  page,
  totalPages,
  activeAdmins,
  currentAdminId,
  filters,
}: AdminUsersManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modal tambah & edit
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<FormState & { isActive: boolean }>({
    ...EMPTY_FORM,
    isActive: true,
  });
  const [editErr, setEditErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const applyFilters = (next: Partial<{ q: string; role: string; status: string; page: number }>) => {
    const params = new URLSearchParams();
    const q = next.q !== undefined ? next.q : filters.q;
    const role = next.role !== undefined ? next.role : filters.role;
    const status = next.status !== undefined ? next.status : filters.status;
    const p = next.page !== undefined ? next.page : 1;
    if (q) params.set('q', q);
    if (role && role !== 'ALL') params.set('role', role);
    if (status && status !== 'ALL') params.set('status', status);
    if (p > 1) params.set('page', String(p));
    router.replace(`/admin/users${params.toString() ? `?${params}` : ''}`);
  };

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      password: '',
      role: u.role,
      phone: u.phone || '',
      isActive: u.isActive,
    });
    setEditErr(null);
  };

  const submitCreate = async () => {
    setCreating(true);
    setCreateErr(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          role: createForm.role,
          phone: createForm.phone || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.details ? Object.values(data.details).flat().join('; ') : '';
        setCreateErr(data?.error || 'Gagal membuat akun.' + (detail ? ` ${detail}` : ''));
        return;
      }
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setNotice({ type: 'ok', text: `Akun "${data.user.name}" berhasil dibuat.` });
      router.refresh();
    } catch {
      setCreateErr('Gagal terhubung ke server.');
    } finally {
      setCreating(false);
    }
  };

  const submitEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    setEditErr(null);
    try {
      const body: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive,
        phone: editForm.phone || null,
      };
      if (editForm.password) body.password = editForm.password;
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.details ? Object.values(data.details).flat().join('; ') : '';
        setEditErr(data?.error || 'Gagal mengubah akun.' + (detail ? ` ${detail}` : ''));
        return;
      }
      setEditUser(null);
      setNotice({ type: 'ok', text: `Perubahan pada "${data.user.name}" tersimpan.` });
      router.refresh();
    } catch {
      setEditErr('Gagal terhubung ke server.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: UserRow) => {
    setBusyId(u.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ type: 'err', text: data?.error || 'Gagal mengubah status akun.' });
        return;
      }
      setNotice({
        type: 'ok',
        text: `Akun "${u.name}" kini ${u.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`,
      });
      router.refresh();
    } catch {
      setNotice({ type: 'err', text: 'Gagal terhubung ke server.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice inline */}
      {notice && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${
            notice.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300'
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Tutup pemberitahuan" className="p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar: pencarian + filter + tambah akun */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ q: search, page: 1 });
          }}
        >
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau email…"
              aria-label="Cari akun"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cari
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select
            aria-label="Filter role"
            value={filters.role}
            onChange={(e) => applyFilters({ role: e.target.value, page: 1 })}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Semua Role</option>
            <option value="ADMIN">Admin</option>
            <option value="CUSTOMER">Customer</option>
          </select>
          <select
            aria-label="Filter status akun"
            value={filters.status}
            onChange={(e) => applyFilters({ status: e.target.value, page: 1 })}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
          <button
            onClick={() => {
              setCreateForm(EMPTY_FORM);
              setCreateErr(null);
              setShowCreate(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Tambah Akun
          </button>
        </div>
      </div>

      {/* Tabel akun */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:bg-slate-900/60 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Akun</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Role</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Status</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px]">Dibuat</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-right">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                  Tidak ada akun yang cocok dengan filter.
                </td>
              </tr>
            )}
            {initialUsers.map((u) => {
              const isSelf = u.id === currentAdminId;
              return (
                <tr
                  key={u.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {u.name}
                          {isSelf && (
                            <span className="ml-1.5 text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                              Anda
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.role === 'ADMIN'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {u.role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
                      {u.role === 'ADMIN' ? 'Admin' : 'Customer'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        u.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20'
                      }`}
                    >
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        aria-label={`Edit akun ${u.name}`}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(u)}
                        disabled={busyId === u.id || isSelf}
                        title={
                          isSelf
                            ? 'Anda tidak dapat menonaktifkan akun sendiri'
                            : u.isActive
                              ? 'Nonaktifkan akun'
                              : 'Aktifkan akun'
                        }
                        aria-label={`${u.isActive ? 'Nonaktifkan' : 'Aktifkan'} akun ${u.name}`}
                        className={`p-1.5 rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed ${
                          u.isActive
                            ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-500/10'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.isActive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span>
          Total <b>{total}</b> akun · {activeAdmins} Admin aktif · Halaman {page} dari {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => applyFilters({ page: page - 1 })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => applyFilters({ page: page + 1 })}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold disabled:opacity-40 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            Berikutnya <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modal Tambah Akun */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div role="dialog" aria-label="Tambah akun" className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Tambah Akun Baru</h3>
              <button onClick={() => setShowCreate(false)} aria-label="Tutup" className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Nama pribadi">
                <input className={inputCls} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nama lengkap" />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="nama@email.com" />
              </Field>
              <Field label="Kata sandi (min. 8)">
                <input className={inputCls} type="password" autoComplete="new-password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="••••••••" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role">
                  <select className={inputCls} value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as 'ADMIN' | 'CUSTOMER' })}>
                    <option value="CUSTOMER">Customer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </Field>
                <Field label="Telepon (opsional)">
                  <input className={inputCls} value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="08…" />
                </Field>
              </div>
              {createErr && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{createErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
                  Batal
                </button>
                <button
                  onClick={submitCreate}
                  disabled={creating || !createForm.name || !createForm.email || createForm.password.length < 8}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {creating ? 'Menyimpan…' : 'Simpan Akun'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Akun */}
      {editUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setEditUser(null)} />
          <div role="dialog" aria-label={`Edit akun ${editUser.name}`} className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Edit Akun — {editUser.name}</h3>
              <button onClick={() => setEditUser(null)} aria-label="Tutup" className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Nama pribadi">
                <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </Field>
              <Field label="Email">
                <input className={inputCls} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Role">
                  <select className={inputCls} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'ADMIN' | 'CUSTOMER' })}>
                    <option value="CUSTOMER">Customer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </Field>
                <Field label="Telepon">
                  <input className={inputCls} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </Field>
              </div>
              <Field label="Kata sandi baru (opsional, min. 8)">
                <input className={inputCls} type="password" autoComplete="new-password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Biarkan kosong jika tidak diganti" />
              </Field>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  disabled={editUser.id === currentAdminId}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Akun aktif
                {editUser.id === currentAdminId && (
                  <span className="text-[10px] text-slate-400">(akun sendiri tidak bisa dinonaktifkan)</span>
                )}
              </label>
              {editErr && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{editErr}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setEditUser(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
                  Batal
                </button>
                <button
                  onClick={submitEdit}
                  disabled={saving || !editForm.name || !editForm.email || (editForm.password.length > 0 && editForm.password.length < 8)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-900 dark:border-slate-800 dark:text-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}
