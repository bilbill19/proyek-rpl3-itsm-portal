'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Monitor,
  RefreshCw,
  HardDrive,
  ShieldAlert,
  Cpu,
  Wifi,
  Headphones,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { ServiceItem } from '@/types';

// Default structured fallback catalog matching the 8 required services
export const DEFAULT_SERVICES = [
  {
    id: 'srv-laptop',
    name: 'Service Laptop',
    description: 'Perbaikan komprehensif untuk semua merk laptop & MacBook. Menangani layar pecah, keyboard error, engsel patah, baterai drop, hingga mati total.',
    price: 150000,
    estimatedDuration: '1 - 3 Hari Kerja',
    category: 'Hardware',
    badge: 'Paling Populer',
    icon: Laptop,
    features: ['Ganti LCD & Keyboard', 'Perbaikan Engsel & Casing', 'Baterai & Charger Original'],
  },
  {
    id: 'srv-pc',
    name: 'Service PC',
    description: 'Diagnostik dan perbaikan PC Desktop, Workstation, & Gaming Rig. Mengatasi blue screen, restart tiba-tiba, no display, dan masalah power supply.',
    price: 120000,
    estimatedDuration: '1 - 2 Hari Kerja',
    category: 'Hardware',
    badge: 'Desktop & Gaming',
    icon: Monitor,
    features: ['Diagnosa Power Supply & Motherboard', 'Optimasi BIOS & Temperatur', 'Manajemen Kabel & Airflow'],
  },
  {
    id: 'srv-os',
    name: 'Install Ulang',
    description: 'Instalasi bersih sistem operasi Windows 11/10, Linux, atau macOS. Termasuk full update driver resmi, aktivasi antivirus, dan software produktivitas.',
    price: 100000,
    estimatedDuration: '2 - 4 Jam',
    category: 'Software & OS',
    badge: 'Fast Track',
    icon: RefreshCw,
    features: ['Windows 11/10 / macOS / Linux', 'Full Official Driver Update', 'Backup Data User Aman'],
  },
  {
    id: 'srv-upgrade',
    name: 'Upgrade RAM/SSD',
    description: 'Meningkatkan performa komputer hingga 10x lebih cepat dengan upgrade storage SSD NVMe/SATA berkecepatan tinggi dan penambahan kapasitas RAM.',
    price: 150000,
    estimatedDuration: '1 - 2 Jam',
    category: 'Hardware',
    badge: 'Kinerja Maksimal',
    icon: HardDrive,
    features: ['Cloning OS Tanpa Hilang Data', 'SSD NVMe PCIe Gen 4/3', 'Dual Channel RAM Tuning'],
  },
  {
    id: 'srv-virus',
    name: 'Pembersihan Virus',
    description: 'Scanning menyeluruh dan pembasmian malware, ransomware, trojan, spyware, serta recovery sistem operasi yang terkunci/terinfeksi virus.',
    price: 90000,
    estimatedDuration: '2 - 5 Jam',
    category: 'Software & OS',
    badge: 'Keamanan Data',
    icon: ShieldAlert,
    features: ['Pembersihan Malware Tuntas', 'Recovery File Terenkripsi/Hidden', 'Instalasi Antivirus Protektif'],
  },
  {
    id: 'srv-hardware',
    name: 'Perbaikan Hardware',
    description: 'Pengerjaan mikroskopis tingkat komponen (Chip Level Repair), perbaikan IC Power, reballing GPU, rekondisi jalur motherboard, dan short circuit.',
    price: 450000,
    estimatedDuration: '3 - 5 Hari Kerja',
    category: 'Hardware',
    badge: 'Teknisi Lab Ahli',
    icon: Cpu,
    features: ['Diagnosa Lab Mikroskopis', 'Perbaikan IC Power & Charging', 'Komponen SMD Original'],
  },
  {
    id: 'srv-network',
    name: 'Jaringan & WiFi',
    description: 'Instalasi & troubleshooting jaringan kabel LAN Cat6, konfigurasi Router Mikrotik, Access Point Wi-Fi Mesh tanpa blank spot, dan setting VPN kantor.',
    price: 250000,
    estimatedDuration: '1 Hari Kerja',
    category: 'Jaringan & IT',
    badge: 'Rumah & Kantor',
    icon: Wifi,
    features: ['Setup Router Mikrotik / Cisco', 'Instalasi Wi-Fi Mesh Seamless', 'Kabel LAN & Crimping Rapih'],
  },
  {
    id: 'srv-support',
    name: 'IT Support',
    description: 'Layanan konsultasi teknis, pemeliharaan preventif komputer kantor berkala, backup otomatis database/NAS, dan kontrak SLA dukungan teknis IT.',
    price: 350000,
    estimatedDuration: 'Sesuai Kontrak / SLA',
    category: 'Jaringan & IT',
    badge: 'Bisnis & UMKM',
    icon: Headphones,
    features: ['Onsite / Remote Helpdesk', 'Maintenance Berkala Komputer', 'Setup NAS Backup Cloud'],
  },
];

// Helper to match icon based on service name
function getServiceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('laptop') || n.includes('macbook')) return Laptop;
  if (n.includes('pc') || n.includes('desktop')) return Monitor;
  if (n.includes('install') || n.includes('os') || n.includes('windows')) return RefreshCw;
  if (n.includes('upgrade') || n.includes('ssd') || n.includes('ram')) return HardDrive;
  if (n.includes('virus') || n.includes('malware') || n.includes('security')) return ShieldAlert;
  if (n.includes('hardware') || n.includes('motherboard') || n.includes('chip')) return Cpu;
  if (n.includes('jaringan') || n.includes('wifi') || n.includes('network')) return Wifi;
  return Headphones;
}

interface ServicesSectionProps {
  initialServices?: ServiceItem[];
}

export function ServicesSection({ initialServices = [] }: ServicesSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['Semua', 'Hardware', 'Software & OS', 'Jaringan & IT'];

  // Use database services if available, otherwise use structured default services
  const displayServices =
    initialServices && initialServices.length > 0
      ? initialServices.map((srv) => ({
          id: srv.id,
          name: srv.name,
          description: srv.description,
          price: Number(srv.price),
          estimatedDuration: srv.estimatedDuration,
          category: srv.name.toLowerCase().includes('os') || srv.name.toLowerCase().includes('virus') ? 'Software & OS' : srv.name.toLowerCase().includes('jaringan') || srv.name.toLowerCase().includes('support') ? 'Jaringan & IT' : 'Hardware',
          badge: 'Bergaransi',
          icon: getServiceIcon(srv.name),
          features: ['Estimasi Biaya Transparan', 'Pengerjaan Standar Industri', 'Garansi Resmi Workshop'],
        }))
      : DEFAULT_SERVICES;

  const filteredServices = displayServices.filter((srv) => {
    const matchesCategory =
      selectedCategory === 'Semua' || srv.category === selectedCategory;
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="services" className="py-20 bg-white dark:bg-slate-900/60 border-t border-b border-slate-200 dark:border-slate-800/80 relative">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Katalog Layanan IT Terlengkap
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Layanan Servis Komputer, Laptop & Jaringan
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Daftar lengkap solusi perbaikan perangkat dan dukungan infrastruktur IT yang ditangani langsung oleh teknisi berpengalaman.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari jenis perbaikan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Services Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredServices.map((srv) => {
            const Icon = srv.icon;
            return (
              <div
                key={srv.id}
                className="group rounded-2xl bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/40 hover:bg-slate-50 dark:hover:bg-slate-900/90 transition-all duration-300 shadow-sm dark:shadow-lg hover:shadow-indigo-500/10"
              >
                <div>
                  {/* Top Bar: Icon & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-700 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200 group-hover:scale-105">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/30 px-2.5 py-1 rounded-full">
                      {srv.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 line-clamp-3">
                    {srv.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 mb-4">
                    {srv.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Bar: Price & Action */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Mulai Dari:</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(srv.price)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Estimasi:</span>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> {srv.estimatedDuration}
                      </span>
                    </div>
                  </div>

                  <Link href="/register" className="block w-full">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full text-xs font-semibold group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all"
                    >
                      <span>Pesan Layanan</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
