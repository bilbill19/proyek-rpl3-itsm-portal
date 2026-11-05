'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ClipboardList,
  User,
  Phone,
  Laptop,
  Wrench,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, getOrderStatusLabel } from '@/lib/utils';

interface AdminOrdersTableProps {
  initialOrders: any[];
}

export function AdminOrdersTable({ initialOrders }: AdminOrdersTableProps) {
  const [orders] = useState<any[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Status Filter Options
  const statusOptions = [
    { value: 'ALL', label: 'Semua Status' },
    { value: 'CREATED', label: 'Pesanan Dibuat (Created)' },
    { value: 'WAITING_CONFIRMATION', label: 'Menunggu Konfirmasi' },
    { value: 'DEVICE_RECEIVED', label: 'Perangkat Diterima' },
    { value: 'CHECKING', label: 'Diagnosa Kerusakan' },
    { value: 'IN_PROGRESS', label: 'Pengerjaan Service' },
    { value: 'WAITING_APPROVAL', label: 'Menunggu Persetujuan' },
    { value: 'COMPLETED', label: 'Service Selesai' },
    { value: 'DELIVERED', label: 'Perangkat Diserahkan' },
  ];

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Search Query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        order.ticketNumber.toLowerCase().includes(query) ||
        order.customer?.name?.toLowerCase().includes(query) ||
        order.customer?.email?.toLowerCase().includes(query) ||
        order.customer?.phone?.toLowerCase().includes(query) ||
        order.deviceType?.toLowerCase().includes(query) ||
        order.deviceBrand?.toLowerCase().includes(query) ||
        order.service?.name?.toLowerCase().includes(query);

      // 2. Status Filter
      const matchesStatus = selectedStatus === 'ALL' || order.status === selectedStatus;

      // 3. Date Filter
      let matchesDate = true;
      if (startDate) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        matchesDate = matchesDate && orderDate >= startDate;
      }
      if (endDate) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        matchesDate = matchesDate && orderDate <= endDate;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, selectedStatus, startDate, endDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Reset page when filters change
  const handleFilterChange = (setter: any, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls Card */}
      <Card className="border-slate-200">
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Search Bar (5 cols) */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no. tiket, nama pelanggan, merk perangkat, layanan..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>

            {/* Status Filter Dropdown (3 cols) */}
            <div className="lg:col-span-3">
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filters (4 cols) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-2">
              <input
                type="date"
                title="Tanggal Mulai"
                value={startDate}
                onChange={(e) => handleFilterChange(setStartDate, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
              />
              <input
                type="date"
                title="Tanggal Akhir"
                value={endDate}
                onChange={(e) => handleFilterChange(setEndDate, e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Active Filter Indicators & Reset */}
          {(searchQuery || selectedStatus !== 'ALL' || startDate || endDate) && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>Filter Aktif:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{filteredOrders.length} tiket ditemukan</span>
              </div>
              <button
                onClick={handleResetFilters}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold transition-colors"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Orders Table */}
      <Card className="border-slate-200 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Daftar Seluruh Tiket Servis ({filteredOrders.length})
            </CardTitle>
            <CardDescription>Kelola status perbaikan, estimasi biaya, dan catatan teknisi lab</CardDescription>
          </div>

          {/* Page size dropdown */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value={5}>5 baris</option>
              <option value={10}>10 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {paginatedOrders.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto">
                <Laptop className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tidak Ada Pesanan yang Sesuai</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                Tidak ada tiket yang cocok dengan filter atau kata kunci pencarian yang Anda masukkan.
              </p>
              <Button size="sm" variant="secondary" onClick={handleResetFilters}>
                <span>Reset Filter</span>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Ticket Number</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Layanan</th>
                    <th className="py-3.5 px-4">Device</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Estimasi Harga</th>
                    <th className="py-3.5 px-4">Tanggal</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {paginatedOrders.map((order) => {
                    const statusInfo = getOrderStatusLabel(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-white dark:hover:bg-slate-900/60 transition-colors group">
                        {/* 1. Ticket Number */}
                        <td className="py-4 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {order.ticketNumber}
                        </td>

                        {/* 2. Customer */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{order.customer?.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                            {order.customer?.email}
                          </div>
                          {order.customer?.phone && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-600" /> {order.customer.phone}
                            </div>
                          )}
                        </td>

                        {/* 3. Layanan */}
                        <td className="py-4 px-4">
                          <span className="text-slate-700 dark:text-slate-200 font-medium block truncate max-w-[150px]">
                            {order.service?.name || 'Diagnosa Kerusakan Umum'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {order.serviceMethod === 'ONSITE' ? '🚗 Teknisi On-Site' : '🏢 Antar Workshop'}
                          </span>
                        </td>

                        {/* 4. Device */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{order.deviceType}</div>
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                            {order.deviceBrand}
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${statusInfo.bg}`}>
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* 6. Estimasi Harga */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-xs">
                            {formatCurrency(order.estimatedPrice || order.finalPrice)}
                          </span>
                          {order.finalPrice && order.finalPrice !== order.estimatedPrice && (
                            <span className="text-[9px] text-slate-600 dark:text-slate-400 block">
                              Final: {formatCurrency(order.finalPrice)}
                            </span>
                          )}
                        </td>

                        {/* 7. Tanggal */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400 text-[11px]">
                          {formatDate(order.createdAt)}
                        </td>

                        {/* 8. Action */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <Link href={`/admin/orders/${order.id}`}>
                            <Button size="sm" variant="secondary" className="text-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <span>Detail & Update</span>
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls Footer */}
          {filteredOrders.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Menampilkan <strong className="text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</strong> hingga{' '}
                <strong className="text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, filteredOrders.length)}</strong> dari{' '}
                <strong className="text-slate-900 dark:text-white">{filteredOrders.length}</strong> total tiket
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <span className="text-xs px-2 font-medium">
                  Halaman <strong className="text-slate-900 dark:text-white">{currentPage}</strong> dari{' '}
                  <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
                </span>

                <Button
                  size="sm"
                  variant="secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
