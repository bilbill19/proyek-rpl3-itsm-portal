'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Bot,
  Bell,
  Activity,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Lock,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Info,
  Copy,
  ExternalLink,
  Network,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { AdminApiInfoPanel } from '@/components/admin/AdminApiInfoPanel';

interface AdminSettingsManagerProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  systemStats: {
    totalUsers: number;
    totalOrders: number;
    totalServices: number;
    totalInventory: number;
    dbStatus: string;
    dbLatencyMs: number;
  };
}

export function AdminSettingsManager({ user, systemStats }: AdminSettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<
    'general' | 'ai' | 'notifications' | 'system' | 'api' | 'account'
  >('general');

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    workshopName: 'ITSM Service & Repair Center',
    workshopTagline: 'Solusi Terpercaya & Cepat Perbaikan Laptop, PC, Printer & Hardware IT',
    hotlinePhone: '+62 812-3456-7890',
    supportEmail: 'support@itsm-service.com',
    workshopAddress: 'Jl. Boulevard IT No. 88, Cyber Technopark, Jakarta Barat',
    operatingHours: 'Senin - Sabtu: 08:30 - 18:00 WIB (Minggu Libur/Darurat)',
    warrantyPolicy:
      'Garansi pengerjaan 30 hari untuk servis hardware dan suku cadang resmi. Garansi software 7 hari setelah pengambilan unit.',
  });

  // AI Diagnostic Settings State
  const [aiSettings, setAiSettings] = useState({
    aiProvider: 'Google Gemini 1.5 Pro',
    aiEnabled: true,
    diagnosisDetail: 'detailed', // 'fast' | 'detailed' | 'expert'
    autoSuggestServices: true,
    confidenceThreshold: 85,
    systemPromptNotes:
      'Sistem menggunakan AI untuk menganalisa deskripsi keluhan kerusakan dari pelanggan dan merekomendasikan estimasi biaya serta paket servis yang relevan.',
  });

  // Notification & Operational Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    lowStockThreshold: 5,
    autoWhatsAppConfirmation: true,
    autoWhatsAppCompleted: true,
    whatsappTicketCreatedTemplate:
      'Halo Kak [NAMA], order servis Anda dengan No. Tiket [NO_TIKET] ([PERANGKAT]) telah kami terima di ITSM Workshop. Teknisi kami akan segera melakukan diagnosa.',
    whatsappTicketCompletedTemplate:
      'Kabar baik Kak [NAMA]! Servis perangkat [PERANGKAT] (No. Tiket: [NO_TIKET]) telah SELESAI dikerjakan & lolos QC test. Anda dapat mengambil unit di workshop kami.',
  });

  // Account Settings State
  const [accountForm, setAccountForm] = useState({
    name: user.name,
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Provider AI AKTIF di backend — dibaca dari server (GET /api/admin/api-status),
  // BUKAN dari localStorage. Menjaga tab ini konsisten dengan
  // "Ringkasan Arsitektur API" dan tidak menampilkan provider yang tak dipakai.
  const [activeAi, setActiveAi] = useState<{
    provider: string;
    model: string;
    geminiConfigured: boolean;
  } | null>(null);
  const [activeAiError, setActiveAiError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'ai' || activeAi || activeAiError) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/api-status', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) throw new Error(data?.error || `HTTP ${res.status}`);
        if (alive) {
          setActiveAi({
            provider: data.provider,
            model: data.model,
            geminiConfigured: Boolean(data.geminiConfigured),
          });
        }
      } catch (e: any) {
        if (alive) setActiveAiError(e?.message || 'Gagal memuat provider aktif dari server.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [activeTab, activeAi, activeAiError]);

  // Load persisted settings from localStorage if available
  useEffect(() => {
    try {
      const savedGeneral = localStorage.getItem('itsm_admin_general_settings');
      if (savedGeneral) setGeneralSettings(JSON.parse(savedGeneral));

      const savedAi = localStorage.getItem('itsm_admin_ai_settings');
      if (savedAi) setAiSettings(JSON.parse(savedAi));

      const savedNotif = localStorage.getItem('itsm_admin_notification_settings');
      if (savedNotif) setNotificationSettings(JSON.parse(savedNotif));
    } catch (e) {
      console.warn('Could not read settings from localStorage:', e);
    }
  }, []);

  // Preferensi provider yang tersimpan di BROWSER ini (localStorage) — hanya
  // untuk ditampilkan jujur bila berbeda dari provider backend yang aktif.
  const storedAiProvider = (aiSettings.aiProvider || '').trim();
  const providerMismatch = Boolean(
    activeAi &&
      storedAiProvider &&
      storedAiProvider.toLowerCase() !== activeAi.provider.trim().toLowerCase()
  );

  const handleSaveSettings = (section: string) => {
    setIsSaving(true);
    setSaveSuccessMessage(null);

    setTimeout(() => {
      try {
        if (section === 'general') {
          localStorage.setItem(
            'itsm_admin_general_settings',
            JSON.stringify(generalSettings)
          );
        } else if (section === 'ai') {
          localStorage.setItem('itsm_admin_ai_settings', JSON.stringify(aiSettings));
        } else if (section === 'notifications') {
          localStorage.setItem(
            'itsm_admin_notification_settings',
            JSON.stringify(notificationSettings)
          );
        }
        setSaveSuccessMessage(`Pengaturan ${section.toUpperCase()} berhasil disimpan!`);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      }
    }, 400);
  };

  const handleCopyTemplate = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(id);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-2">
            <Settings className="w-3.5 h-3.5" /> Konfigurasi & Preferensi Sistem
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Pengaturan Sistem & Workspace
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Konfigurasi profil workshop, modul AI diagnosa, template pesan WhatsApp, status server, dan hak akses administrator.
          </p>
        </div>

        {/* Global Save Success Notification */}
        {saveSuccessMessage && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold animate-fade-in shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'general'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Profil Bengkel / Workshop</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'ai'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Diagnosa & Asisten</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifikasi & WhatsApp</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'system'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Kesehatan & Diagnostik Sistem</span>
        </button>

        <button
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'api'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Informasi API</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeTab === 'account'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Akun Administrator</span>
        </button>
      </div>

      {/* TAB 1: WORKSHOP PROFILE */}
      {activeTab === 'general' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Informasi Bisnis & Workshop Layanan IT
                </CardTitle>
                <CardDescription>
                  Data identitas bengkel servis yang ditampilkan pada nota servis, struk tiket, dan profil publik
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => handleSaveSettings('general')}
                disabled={isSaving}
                className="shadow-lg shadow-indigo-600/20"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 pt-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Nama Workshop / Store
                  </label>
                  <input
                    type="text"
                    value={generalSettings.workshopName}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, workshopName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Tagline / Slogan Layanan
                  </label>
                  <input
                    type="text"
                    value={generalSettings.workshopTagline}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, workshopTagline: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Nomor WhatsApp / Hotline Pelanggan
                  </label>
                  <input
                    type="text"
                    value={generalSettings.hotlinePhone}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, hotlinePhone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Email Resmi Dukungan Pelanggan
                  </label>
                  <input
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    Alamat Fisik Workshop & Pusat Penerimaan Unit
                  </label>
                  <input
                    type="text"
                    value={generalSettings.workshopAddress}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, workshopAddress: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    Jam Operasional Layanan
                  </label>
                  <input
                    type="text"
                    value={generalSettings.operatingHours}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, operatingHours: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    Kebijakan Garansi Standar Service
                  </label>
                  <textarea
                    rows={3}
                    value={generalSettings.warrantyPolicy}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, warrantyPolicy: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: AI DIAGNOSTIC SETTINGS */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  Konfigurasi Asisten AI Diagnosa Kerusakan
                </CardTitle>
                <CardDescription>
                  Preferensi tampilan asisten AI (level analisa, saran katalog, catatan prompt) —
                  provider & model aktif dikelola di sisi server
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => handleSaveSettings('ai')}
                disabled={isSaving}
                className="shadow-lg shadow-indigo-600/20"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Menyimpan...' : 'Simpan AI Config'}
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 pt-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Provider Model AI (aktif di backend)
                  </label>
                  {/* READ-ONLY: nilai dari server (bukan localStorage, bukan kontrol palsu) */}
                  <div className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 min-w-0">
                      <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      {activeAi ? (
                        <span className="min-w-0 break-words">
                          {activeAi.provider}{' '}
                          <span className="font-mono text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            · {activeAi.model}
                          </span>
                        </span>
                      ) : activeAiError ? (
                        <span className="font-normal text-red-600 dark:text-red-400">{activeAiError}</span>
                      ) : (
                        <span className="font-normal text-slate-400 dark:text-slate-500">
                          Memuat dari server…
                        </span>
                      )}
                    </span>
                    {activeAi && <Badge variant="info">Read-only</Badge>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Tingkat Kedalaman Analisa Diagnosa
                  </label>
                  <select
                    value={aiSettings.diagnosisDetail}
                    onChange={(e) =>
                      setAiSettings({ ...aiSettings, diagnosisDetail: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="fast">Cepat & Ringkas (Estimasi awal instan)</option>
                    <option value="detailed">Mendalam & Terperinci (Analisa komponen & estimasi part)</option>
                    <option value="expert">Level Expert / Teknisi Senior (Sertakan panduan teknis)</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Status Modul AI</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Aktifkan fitur chatbot konsultasi pintar di portal pelanggan
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiSettings({ ...aiSettings, aiEnabled: !aiSettings.aiEnabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      aiSettings.aiEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        aiSettings.aiEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Auto-Suggest Katalog Layanan</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      AI mencocokkan keluhan dengan daftar paket servis yang ada di database
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setAiSettings({
                        ...aiSettings,
                        autoSuggestServices: !aiSettings.autoSuggestServices,
                      })
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      aiSettings.autoSuggestServices ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        aiSettings.autoSuggestServices ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Instruksi Khusus (System Prompt Guideline)
                  </label>
                  <textarea
                    rows={3}
                    value={aiSettings.systemPromptNotes}
                    onChange={(e) =>
                      setAiSettings({ ...aiSettings, systemPromptNotes: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* ================================================================ */}
              {/* CATATAN KONFIGURASI AI — bagian PALING BAWAH section ini,          */}
              {/* setelah seluruh kontrol & textarea (bukan di tengah form).          */}
              {/* ================================================================ */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Catatan Konfigurasi AI
                </p>

                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Nilai dibaca langsung dari konfigurasi server saat halaman dibuka. Provider AI
                  dijalankan di sisi backend dan <b>tidak dapat diganti melalui UI</b>; pilihan
                  dropdown lama hanyalah preferensi tampilan di browser (localStorage) dan tidak
                  pernah memengaruhi pipeline AI.
                </p>

                {providerMismatch && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    <p className="font-bold flex items-center gap-1.5 mb-0.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Konfigurasi tersimpan ≠ provider aktif
                    </p>
                    <p>
                      Preferensi lama <b>&quot;{storedAiProvider}&quot;</b> hanya tersimpan di
                      browser — <b>TIDAK digunakan backend</b>. Provider aktif saat ini:{' '}
                      <b>{activeAi?.provider}</b> ·{' '}
                      <span className="font-mono">{activeAi?.model}</span>.
                      {activeAi && !activeAi.geminiConfigured && /gemini/i.test(storedAiProvider) && (
                        <> Google Gemini tidak memiliki kredensial di server (belum dikonfigurasi).</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS & WHATSAPP */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  Notifikasi Otomatis & Template Pesan WhatsApp
                </CardTitle>
                <CardDescription>
                  Kustomisasi format pesan yang dikirimkan kepada pelanggan saat status servis berubah
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => handleSaveSettings('notifications')}
                disabled={isSaving}
                className="shadow-lg shadow-indigo-600/20"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {isSaving ? 'Menyimpan...' : 'Simpan Template'}
              </Button>
            </CardHeader>

            <CardContent className="space-y-5 pt-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Ambang Batas Peringatan Stok Menipis (Default Unit)
                  </label>
                  <input
                    type="number"
                    value={notificationSettings.lowStockThreshold}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        lowStockThreshold: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">
                    Sistem akan memunculkan badge peringatan saat sparepart memiliki stok &le; angka ini.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Auto WhatsApp Notification</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Kirim update berkala otomatis saat status tiket diperbarui
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    Siap Digunakan
                  </span>
                </div>

                {/* Template 1 */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                      Template Pesan: Tiket Diterima (CREATED / DEVICE_RECEIVED)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyTemplate(
                          notificationSettings.whatsappTicketCreatedTemplate,
                          'created'
                        )
                      }
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedTemplate === 'created' ? 'Tersalin!' : 'Salin Template'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={notificationSettings.whatsappTicketCreatedTemplate}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        whatsappTicketCreatedTemplate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Placeholder tersedia: <code className="text-indigo-700 dark:text-indigo-300">[NAMA]</code>,{' '}
                    <code className="text-indigo-700 dark:text-indigo-300">[NO_TIKET]</code>,{' '}
                    <code className="text-indigo-700 dark:text-indigo-300">[PERANGKAT]</code>
                  </p>
                </div>

                {/* Template 2 */}
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                      Template Pesan: Servis Selesai (COMPLETED)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyTemplate(
                          notificationSettings.whatsappTicketCompletedTemplate,
                          'completed'
                        )
                      }
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedTemplate === 'completed' ? 'Tersalin!' : 'Salin Template'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={notificationSettings.whatsappTicketCompletedTemplate}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        whatsappTicketCompletedTemplate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: SYSTEM HEALTH & DIAGNOSTICS */}
      {activeTab === 'system' && (
        <div className="space-y-6 animate-fade-in">
          {/* Health Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">PostgreSQL Database</span>
                <Database className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {systemStats.dbStatus}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Latency: <span className="text-slate-600 dark:text-slate-300 font-mono">{systemStats.dbLatencyMs}ms</span>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Framework & Engine</span>
                <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white">Next.js 14.2</p>
              <p className="text-[11px] text-slate-500 mt-1">App Router + Server Actions</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">ORM Layer</span>
                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-xl font-black text-purple-700 dark:text-purple-300">Prisma v5.22</p>
              <p className="text-[11px] text-slate-500 mt-1">PostgreSQL Client Synchronized</p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Keamanan & RBAC</span>
                <ShieldCheck className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
              </div>
              <p className="text-xl font-black text-cyan-700 dark:text-cyan-300">JWT HttpOnly</p>
              <p className="text-[11px] text-slate-500 mt-1">Role ADMIN & CUSTOMER Protected</p>
            </div>
          </div>

          {/* Database Entities Summary Card */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-700 dark:text-emerald-600" />
                Statistik Rekaman Database Live
              </CardTitle>
              <CardDescription>
                Jumlah entitas data yang tersimpan aktif di PostgreSQL
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Total Customer:</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">
                    {systemStats.totalUsers} Pengguna
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Total Tiket Servis:</span>
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {systemStats.totalOrders} Tiket
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Katalog Layanan:</span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 block">
                    {systemStats.totalServices} Paket
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-slate-600 dark:text-slate-400 block text-[11px]">Item Sparepart:</span>
                  <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 block">
                    {systemStats.totalInventory} SKU
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB: INFORMASI API (ringkasan arsitektur, endpoint, status, demo) */}
      {activeTab === 'api' && <AdminApiInfoPanel />}

      {/* TAB 5: ADMIN ACCOUNT */}
      {activeTab === 'account' && (
        <div className="space-y-6 animate-fade-in">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                Informasi Akun & Hak Akses Administrator
              </CardTitle>
              <CardDescription>
                Detail akun session yang sedang aktif saat ini
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-base text-white shadow-lg shadow-indigo-600/30">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase">
                      Role: {user.role} (Super Admin)
                    </span>
                  </div>
                </div>

                <div className="text-right sm:text-right">
                  <span className="text-[10px] text-slate-500 block">User ID Session:</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">{user.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Nama Lengkap Administrator
                  </label>
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-300 font-semibold uppercase text-[11px] tracking-wide">
                    Alamat Email Admin
                  </label>
                  <input
                    type="email"
                    value={accountForm.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-500">
                    Email login utama dikunci untuk keamanan sistem.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
