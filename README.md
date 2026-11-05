# IT Service Management (ITSM) Portal

Portal enterprise modern dan terintegrasi untuk manajemen operasional layanan servis komputer, laptop, server, dan infrastruktur IT. Aplikasi ini dilengkapi dengan asisten diagnosa AI cerdas (*AI Diagnostic Assistant* "Miko"), sistem pelacakan tiket servis real-time (*Real-Time Ticket Tracking*), manajemen suku cadang/inventaris, manajemen user terpusat, notifikasi transaksional, serta manajemen hak akses berbasis peran (*Role-Based Access Control* / RBAC).

---

## 📌 Identitas & Informasi Proyek

Proyek ini disusun dan dikembangkan untuk memenuhi tugas Proyek Akhir Rekayasa Perangkat Lunak:

| Komponen | Keterangan |
| :--- | :--- |
| **Nama Mahasiswa** | Bilbina Maharani |
| **NIM** | 41257095 |
| **Kelompok** | 3 |
| **Tema Topik Kelompok** | Ranah Bisnis |
| **Nama Aplikasi** | IT Service Management (ITSM) Portal |

---

## 🎥 Tautan Video Progres & Demonstrasi

Berikut adalah tautan dokumentasi video pengembangan dan demonstrasi aplikasi ITSM Portal:

| Tahapan Video | Tautan Video | Keterangan |
| :--- | :--- | :--- |
| **Video Progres 1** | `[URL Video Progres 1 - Belum Tersedia]` | Presentasi analisis kebutuhan, perancangan sistem, dan setup arsitektur awal |
| **Video Progres 2** | `[URL Video Progres 2 - Belum Tersedia]` | Demonstrasi implementasi fitur inti, database, autentikasi RBAC, dan integrasi AI |
| **Video Final Demo** | `[URL Video Final Demo - Belum Tersedia]` | Demonstrasi menyeluruh pengujian fungsionalitas aplikasi, skenario Admin & Customer |

> *Catatan: Tautan video di atas merupakan placeholder resmi yang dapat diperbarui saat link rekaman video telah dipublikasikan.*

---

## 💡 Deskripsi Aplikasi & Fitur AI

### Tentang ITSM Portal
**ITSM Portal** adalah solusi perangkat lunak berbasis web yang dirancang khusus untuk mendigitalkan dan mengoptimalkan seluruh alur kerja bisnis jasa perbaikan dan pemeliharaan teknologi informasi (*IT Service & Maintenance*). Sistem menghubungkan pelanggan (*Customer*) yang membutuhkan jasa perbaikan dengan teknisi/administrator (*Admin*) yang menangani workshop dan inventaris.

Aplikasi ini mencakup modul fungsional:
1. **Katalog Layanan IT Dinamis**: Pengelolaan katalog servis, estimasi durasi, dan tarif biaya perbaikan.
2. **Siklus Hidup Tiket Servis (Order Management)**: Alur status perbaikan dari pemesanan awal, penerimaan perangkat, diagnosa kerusakan, proses servis teknisi, verifikasi garansi, hingga penyerahan kembali ke pelanggan.
3. **Pelacakan Publik Real-Time**: Fitur pelacakan status tiket langsung menggunakan kode tiket unik (misal: `SRV-2026-0001`) tanpa mewajibkan login.
4. **Manajemen User & Hak Akses (RBAC)**: Pengelolaan akun Admin dan Customer, penonaktifan akun, serta proteksi fail-closed.
5. **Manajemen Suku Cadang / Inventaris**: Pencatatan komponen hardware, penyesuaian stok, dan pemantauan batas minimum stok.
6. **Notifikasi Transaksional**: Notifikasi in-app dan integrasi outbox WhatsApp untuk pembaruan status pengerjaan.

### 🤖 Fitur AI Smart Diagnostic & Consultation Assistant ("Miko")
Asisten AI cerdas terintegrasi yang berfungsi sebagai konsultan teknis lini pertama (*First-Line Diagnostic Agent*):
- **Konsultasi Interaktif 24/7 (`/dashboard/ai` & Floating Chat)**: Pelanggan dapat berkonsultasi mengenai gejala kerusakan perangkat keras maupun perangkat lunak kapan saja.
- **Analisis Kemungkinan Kerusakan**: Miko menganalisis keluhan pengguna secara cerdas dan memberikan rangkuman diagnosa akar masalah terstruktur.
- **Panduan Troubleshooting Mandiri**: Memberikan langkah-langkah penanganan awal yang aman dilakukan pengguna sebelum memutuskan membawa perangkat ke workshop.
- **Rekomendasi Layanan Servis Relevan**: Mengaitkan keluhan secara kontekstual dengan katalog servis resmi workshop (misal: pembersihan debu & ganti thermal paste, instalasi OS, penggantian baterai/keyboard) lengkap dengan estimasi harga dan durasi.
- **Pemesanan 1-Klik (*Pre-filled Order*)**: Menghubungkan rekomendasi AI langsung ke formulir pemesanan baru (`/dashboard/orders/new`) dengan deskripsi kerusakan dan jenis servis yang terisi otomatis.
- **AI Asisten Operasional Admin**: Admin dapat meminta rangkuman performa operasional, antrian tiket servis aktif, dan status suku cadang.
- **Arsitektur Modular Multi-Provider**: Mendukung berbagai provider model AI yang dapat dikonfigurasi melalui environment variable (`AI_PROVIDER`):
  - **Google Gemini** (Gemini 1.5 Flash / Pro)
  - **OpenAI** (GPT-4o / GPT-3.5 Turbo)
  - **Anthropic Claude** (Claude 3.5 Sonnet)
  - **Ollama** (Model lokal seperti Llama 3 / Mistral)
  - **Expert Engine (Offline Fallback)**: Mesin pakar berbasis aturan lokal tanpa ketergantungan API eksternal yang menjamin ketersediaan sistem 100% (*Zero Downtime*).

---

## 🛠️ Teknologi yang Digunakan

Daftar pustaka dan perangkat lunak yang digunakan dalam pengembangan sistem mengacu pada `package.json`:

| Kategori | Teknologi | Versi | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Framework Fullstack** | [Next.js](https://nextjs.org/) | `15.5.29` (App Router) | Framework React modern untuk SSR, Route Handlers, dan Server Components |
| **Library UI** | [React](https://react.dev/) | `18.3.1` | Core library antarmuka pengguna berbasis komponen |
| **Bahasa Pemrograman** | [TypeScript](https://www.typescriptlang.org/) | `5.9.3` | Type-safe static typing untuk mencegah runtime errors |
| **Styling & Desain** | [Tailwind CSS](https://tailwindcss.com/) | `3.4.15` | Utility-first CSS framework, responsive layout, Glassmorphism, & Dark Mode |
| **Icon System** | [Lucide React](https://lucide.dev/) | `^0.460.0` | Ikon SVG modern dan modular |
| **Theme Management** | [next-themes](https://github.com/pacocoursey/next-themes) | `^0.4.6` | Manajemen transisi tema Light Mode dan Dark Mode |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | `14+` | Relational Database Management System (RDBMS) |
| **ORM & Database Client** | [Prisma ORM](https://www.prisma.io/) | `5.22.0` | Type-safe query builder, migrasi skema, dan relasi data relasional |
| **Autentikasi & Keamanan** | [Jose](https://github.com/panva/jose) & [Bcryptjs](https://github.com/dcodeIO/bcrypt.js) | `^5.9.6` / `^2.4.3` | Enkripsi JWT session cookie (HS256) & hashing password aman |
| **Validasi Skema Data** | [Zod](https://zod.dev/) | `^3.23.8` | Validasi runtime type-safe untuk input formulir dan REST API payload |
| **Utility Helper** | `clsx` & `tailwind-merge` | `^2.1.1` / `^2.5.5` | Helper kondisional class styling Tailwind secara optimal |

---

## 🎯 Fitur Utama Sistem

### 1. 🛡️ Keamanan & Hak Akses Berbasis Peran (RBAC)
- **Role ADMIN:** Mengelola antrian tiket servis masuk, memperbarui status pengerjaan, menginput harga final, mencatat catatan teknisi, mengelola katalog layanan, stok suku cadang, dan akun pengguna.
- **Role CUSTOMER:** Mengajukan pesanan servis perbaikan (Drop-Off ke toko atau Onsite ke lokasi), berkonsultasi dengan asisten AI, memantau riwayat garansi, dan melacak progres servis.
- **Isolasi Data Ketat:** Setiap query database memverifikasi kepemilikan sesi pengguna (`session.id`), mencegah akses tidak sah antar-pelanggan.
- **Next.js Route Protection:** Edge Middleware dan helper guards server-side (`requireAdmin`, `requireCustomer`) membatasi akses URL secara ketat.
- **Reset Password Aman Kriptografis:** Menggunakan token JWT stateless 15 menit yang terikat dengan hash password aktif.

### 2. 📦 Siklus Pelacakan Servis Real-Time (`/track` & `/dashboard/orders/[id]`)
- Linimasa tahapan status pengerjaan:
  `CREATED` → `DEVICE_RECEIVED` → `CHECKING` → `IN_PROGRESS` → `COMPLETED` → `DELIVERED` (atau `CANCELLED`).
- Riwayat status (*status history*) dilengkapi catatan perkembangan teknisi dan stempel waktu.
- Notifikasi pembaruan status terintegrasi secara otomatis ke antrian pesan.

### 3. 👥 Manajemen User Terpusat (`/admin/users`)
- Panel kontrol akun Administrator dan Pelanggan.
- Pengaturan identitas akun, peran (*role*), dan status aktif/nonaktif akun.
- Proteksi keamanan: pencegahan penonaktifan diri sendiri oleh admin aktif dan perlindungan agar sistem tidak kehilangan admin aktif terakhir.

### 4. 🧰 Manajemen Inventaris & Suku Cadang (`/admin/inventory`)
- Pencatatan katalog suku cadang hardware (RAM, SSD, Baterai, Keyboard, Pasta Pendingin, dll.).
- Pemantauan stok masuk, stok keluar, batas minimum stok, dan harga beli vs harga jual.

---

## 📁 Struktur Folder Proyek

```
it-service-management/
├── docs/                         # Panduan dan dokumentasi teknis tambahan
├── prisma/
│   ├── schema.prisma             # Skema Database PostgreSQL (User, Service, ServiceOrder, Inventory, dll.)
│   ├── seed.ts                   # Seeder data awal (Akun Admin, Customer, Katalog Layanan, & Inventaris)
│   └── migrations/               # Riwayat migrasi skema Prisma
├── public/                       # File aset statis, gambar layanan, dan logo
├── src/
│   ├── app/                      # Next.js 15 App Router (Pages & Route Handlers)
│   │   ├── (auth)/               # Rute Autentikasi Publik
│   │   │   ├── login/page.tsx    # Halaman Login
│   │   │   ├── register/page.tsx # Halaman Pendaftaran Akun Pelanggan
│   │   │   ├── forgot-password/  # Permintaan Reset Password
│   │   │   └── reset-password/   # Formulir Reset Password Berbasis Token
│   │   ├── (dashboard)/
│   │   │   └── admin/            # Area Khusus Administrator
│   │   │       ├── dashboard/    # KPI Metrik, Antrian Servis, & Status Workshop
│   │   │       ├── orders/       # Manajemen Tiket & Status Pengerjaan ([id]/page.tsx)
│   │   │       ├── services/     # Manajemen Katalog Layanan (new/ & [id]/edit/)
│   │   │       ├── inventory/    # Manajemen Suku Cadang & Stok
│   │   │       ├── users/        # Manajemen Akun User & Otorisasi
│   │   │       └── reports/      # Laporan Performa & Analitik
│   │   ├── dashboard/            # Area Khusus Pelanggan (Customer Portal)
│   │   │   ├── page.tsx          # Ringkasan Pesanan & Tracking Cepat
│   │   │   ├── ai/page.tsx       # Konsultasi AI Assistant & Chat History
│   │   │   ├── orders/           # Daftar Pesanan, Order Baru, & Detail Tiket ([id]/page.tsx)
│   │   │   ├── history/page.tsx  # Riwayat Servis Selesai & Garansi
│   │   │   ├── tracking/page.tsx # Pelacakan Tiket Internal Customer
│   │   │   └── profile/page.tsx  # Pengaturan Profil & Kata Sandi
│   │   ├── track/page.tsx        # Halaman Pelacakan Publik Tanpa Login
│   │   ├── api/                  # Backend REST API Endpoints
│   │   │   ├── admin/            # API Khusus Admin (Status, Manajemen User)
│   │   │   ├── ai/               # Endpoint Riwayat & Percakapan AI
│   │   │   ├── auth/             # Login, Register, Logout, Reset Password
│   │   │   ├── customers/        # API Data Pelanggan
│   │   │   ├── inventory/        # API CRUD Suku Cadang & Penyesuaian Stok
│   │   │   ├── notifications/    # API Notifikasi & Status Dibaca
│   │   │   ├── orders/           # API Pesanan Servis & Update Status
│   │   │   ├── services/         # API Katalog Layanan
│   │   │   ├── track/            # API Pelacakan Publik
│   │   │   └── whatsapp/         # Dispatcher Outbox & Webhook Notifikasi
│   │   ├── globals.css           # Styling dasar, CSS variables, & Glassmorphism
│   │   ├── layout.tsx            # Root Layout dengan Theme Provider & Toast
│   │   └── page.tsx              # Landing Page Utama
│   ├── components/               # Komponen Modular Antarmuka
│   │   ├── admin/                # Komponen Khusus Admin (Manager, Form, Modal)
│   │   ├── ai/                   # Komponen Chat AI Miko & Floating Assistant
│   │   ├── landing/              # Komponen Landing Page (Hero, Fitur, Alur, FAQ)
│   │   ├── layout/               # Navbar, Footer, AdminSidebar, CustomerSidebar
│   │   └── ui/                   # Reusable UI Primitives (Button, Input, Card, Modal, Badge)
│   ├── lib/                      # Business Logic & Utility Backend
│   │   ├── ai/                   # Modular AI Engine (Gemini, OpenAI, Claude, Ollama, Expert)
│   │   ├── auth.ts               # JWT Session Cookies (Async Next.js 15) & Password Hashing
│   │   ├── prisma.ts             # Prisma Client singleton
│   │   ├── rbac.ts               # Server Security Guards (requireAdmin, requireCustomer)
│   │   ├── utils.ts              # Formatter Rupiah, Tanggal, & Helpers
│   │   └── validations/          # Skema Validasi Zod
│   ├── middleware.ts             # Next.js Edge Middleware untuk proteksi rute
│   └── types/                    # Definisi Interface & Tipe TypeScript
├── .env.example                  # Contoh variabel konfigurasi environment
├── package.json                  # Konfigurasi dependensi proyek
├── tailwind.config.ts            # Konfigurasi Tailwind CSS
└── tsconfig.json                 # Konfigurasi TypeScript
```

---

## 🗺️ Daftar Route Aplikasi

### Halaman Antarmuka (Frontend)
| Route | Akses / Role | Deskripsi |
| :--- | :--- | :--- |
| `/` | Publik | Landing page utama pengenalan layanan, alur servis, dan info kontak |
| `/track` | Publik | Halaman pelacakan tiket servis publik menggunakan nomor tiket |
| `/login` | Tamu (Guest) | Halaman masuk akun dengan tombol cepat Demo Login |
| `/register` | Tamu (Guest) | Halaman pendaftaran akun pelanggan baru |
| `/forgot-password` | Tamu (Guest) | Permintaan tautan pemulihan kata sandi |
| `/reset-password` | Tamu (Guest) | Pembaruan kata sandi menggunakan token kriptografis |
| `/dashboard` | `CUSTOMER` | Customer Portal: ringkasan status perbaikan aktif & aksi cepat |
| `/dashboard/ai` | `CUSTOMER` | AI Diagnostic Assistant: konsultasi kerusakan & rekomendasi solusi |
| `/dashboard/orders` | `CUSTOMER` | Daftar seluruh tiket pesanan servis milik pelanggan |
| `/dashboard/orders/new` | `CUSTOMER` | Formulir pemesanan perbaikan baru (Drop-off / Onsite) |
| `/dashboard/orders/[id]`| `CUSTOMER` / `ADMIN` | Rincian detail pesanan dan linimasa status pengerjaan |
| `/dashboard/history` | `CUSTOMER` | Arsip riwayat servis yang telah selesai beserta status garansi |
| `/dashboard/tracking` | `CUSTOMER` | Pelacakan tiket internal pelanggan |
| `/dashboard/profile` | `CUSTOMER` | Pengaturan data profil dan perubahan kata sandi |
| `/admin/dashboard` | `ADMIN` | Admin Portal: statistik KPI, antrian tiket servis, & pesanan baru |
| `/admin/orders` | `ADMIN` | Manajemen antrian tiket servis global dan pembaruan pengerjaan |
| `/admin/orders/[id]` | `ADMIN` | Rincian tiket, penetapan harga final, & riwayat pengerjaan |
| `/admin/services` | `ADMIN` | Manajemen katalog layanan IT, durasi, dan tarif |
| `/admin/services/new` | `ADMIN` | Formulir penambahan layanan servis baru |
| `/admin/services/[id]/edit` | `ADMIN` | Formulir penyuntingan data layanan servis |
| `/admin/inventory` | `ADMIN` | Manajemen suku cadang, stok masuk/keluar, dan batas minimum stok |
| `/admin/users` | `ADMIN` | Manajemen akun pengguna (Admin & Customer), status aktif, & peran |
| `/admin/reports` | `ADMIN` | Laporan statistik pendapatan, jenis servis terpopuler, dan kinerja |

### REST API Endpoints
| Endpoint | Method | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | POST | Publik | Pendaftaran akun customer baru |
| `/api/auth/login` | POST | Publik | Autentikasi akun & penerbitan session cookie |
| `/api/auth/forgot-password` | POST | Publik | Pembuatan token pemulihan sandi (15 menit) |
| `/api/auth/reset-password` | POST | Publik | Validasi token reset dan pembaharuan kata sandi |
| `/api/auth/logout` | POST | Authenticated | Penghapusan session cookie (Logout) |
| `/api/services` | GET / POST | Publik / `ADMIN` | Ambil katalog layanan aktif / Tambah layanan baru |
| `/api/services/[id]` | GET / PATCH / DELETE | `ADMIN` / Publik | Detail, pembaruan data, atau penghapusan layanan |
| `/api/orders` | GET / POST | Authenticated | Ambil daftar pesanan / Buat pesanan baru |
| `/api/orders/[id]` | GET / PATCH | Authenticated / `ADMIN` | Detail pesanan / Update status pengerjaan & harga |
| `/api/customers` | GET | `ADMIN` | Ambil daftar data pelanggan dan statistik pesanan |
| `/api/customers/[id]` | GET / PATCH / DELETE | `ADMIN` | Detail pelanggan, pembaruan profil, atau hapus akun |
| `/api/inventory` | GET / POST | `ADMIN` | Ambil daftar inventaris / Tambah item suku cadang baru |
| `/api/inventory/[id]` | GET / PATCH / DELETE | `ADMIN` | Detail, edit stok/data suku cadang, atau hapus item |
| `/api/admin/users` | GET / POST | `ADMIN` | Ambil daftar user akun / Buat akun baru |
| `/api/admin/users/[id]` | PATCH | `ADMIN` | Update identitas, peran, status aktif, atau password user |
| `/api/notifications` | GET | Authenticated | Ambil daftar notifikasi in-app pengguna |
| `/api/notifications/[id]` | PATCH | Authenticated | Tandai satu notifikasi sebagai telah dibaca |
| `/api/notifications/read-all`| POST | Authenticated | Tandai seluruh notifikasi pengguna sebagai telah dibaca |
| `/api/ai/conversations` | GET / POST | Authenticated | Ambil riwayat atau buat sesi percakapan AI baru |
| `/api/ai/conversations/[id]` | GET / DELETE | Authenticated | Ambil riwayat chat atau hapus sesi percakapan AI |
| `/api/ai/conversations/[id]/messages` | POST | Authenticated | Kirim pesan pertanyaan ke AI & simpan balasan |
| `/api/track` | GET | Publik | Cari status pesanan publik via nomor tiket |

---

## 🚀 Petunjuk Instalasi & Menjalankan Aplikasi

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi di lingkungan lokal:

### 1. Prasyarat Sistem
Pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `18.17.0` atau `20.x` atau lebih baru
- **NPM**: Versi `9.x` atau lebih baru
- **PostgreSQL**: Versi `14` atau lebih baru yang sedang berjalan aktif

### 2. Kloning Repositori & Instalasi Dependensi
```bash
# Kloning repositori proyek
git clone <URL_REPOSITORI_PROYEK>
cd projek_rpl

# Install seluruh paket dependensi
npm install
```

### 3. Konfigurasi Environment Variable (`.env`)
Salin file `.env.example` menjadi `.env.local` atau `.env`:
```bash
cp .env.example .env
```

Sesuaikan variabel konfigurasi di dalam file `.env`:
```env
# Koneksi Database PostgreSQL
DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/itsm_db?schema=public"

# Kunci Rahasia JWT (Wajib diisi string acak aman untuk penandatanganan sesi)
JWT_SECRET="itsm_super_secure_jwt_secret_key_2026_production_grade"

# Base URL Aplikasi
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Konfigurasi Provider AI Engine
# Pilihan: expert (Default Offline), gemini, openai, anthropic, ollama
AI_PROVIDER="expert"

# (Opsional) Jika menggunakan Provider Cloud AI:
# GEMINI_API_KEY="AIzaSy..."
# OPENAI_API_KEY="sk-..."
```

### 4. Sinkronisasi Database & Seeding Data Awal
Jalankan perintah Prisma untuk menerapkan skema tabel dan mengisi data demo awal:
```bash
# Generate Prisma Client
npm run prisma:generate

# Terapkan skema tabel ke database PostgreSQL
npm run prisma:push

# Jalankan seeder untuk mengisi data awal (Admin, Customer, Layanan, Suku Cadang)
npm run seed
```

### 5. Menjalankan Aplikasi dalam Mode Development
```bash
npm run dev
```
Buka browser dan akses alamat: **`http://localhost:3000`**

### 6. Membangun Aplikasi untuk Mode Production
```bash
# Pemeriksaan tipe data TypeScript
npx tsc --noEmit

# Kompilasi dan optimasi build production
npm run build

# Menjalankan server production
npm run start
```

---

## 🔐 Kredensial Akun Demo

Aplikasi menyediakan akun bawaan dari hasil *seeding* untuk memudahkan evaluasi dan pengujian fungsionalitas sistem:

| Peran (Role) | Email | Kata Sandi | Akses Dashboard |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@itservice.com` | `Password123!` | `/admin/dashboard` |
| **Customer (Pelanggan)** | `customer@itservice.com` | `Password123!` | `/dashboard` |

> *Tips: Pada halaman Login (`/login`), tersedia tombol **Demo Admin** dan **Demo Customer** untuk mengisi kredensial secara otomatis dalam 1 kali klik.*

---

## 🛡️ Jaminan Keamanan & Rekayasa Perangkat Lunak

- **Next.js 15 Async Architecture:** Kompatibilitas penuh dengan standar arsitektur asinkron Next.js 15 (`params`, `searchParams`, dan `cookies()`).
- **Keamanan Autentikasi (Fail-Closed):** Penolakan sesi secara tegas bila `JWT_SECRET` belum dikonfigurasi, cookie sesi menggunakan atribut `HttpOnly`, `SameSite=Lax`, dan `Secure`.
- **Pencegahan SQL Injection:** Seluruh interaksi database melalui Prisma ORM dengan *parameterized queries*.
- **Sanitasi Data Sensitif:** Endpoint pelacakan publik `/api/track` dan respon API tidak pernah mengekspos hash kata sandi maupun data pribadi yang tidak berwenang.
- **Fail-Safe AI Mechanism:** Apabila layanan cloud AI pihak ketiga mengalami limit kuota atau kendala jaringan, arsitektur modular secara otomatis mengalihkan (*fallback*) ke mesin pakar lokal (*ExpertEngine*) tanpa memicu crash atau downtime pada aplikasi.
