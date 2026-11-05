# IT Service Management (ITSM) Platform

Platform enterprise modern dan terintegrasi untuk manajemen operasional layanan service komputer, laptop, server, dan infrastruktur IT. Dilengkapi dengan asisten diagnosa AI cerdas (*AI Diagnostic Assistant*), sistem pelacakan tiket servis real-time (*Real-Time Ticket Tracking*), dan manajemen hak akses berbasis peran (*Role-Based Access Control* / RBAC).

---

## 🛠️ Teknologi yang Digunakan

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) | React framework untuk SSR, Server Actions, & Route Handlers |
| **Bahasa** | [TypeScript 5](https://www.typescriptlang.org/) | Type safety & strict static typing |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS | Modern responsive design system, Glassmorphism, Dark Mode |
| **Icons** | [Lucide React](https://lucide.dev/) | Icon library modern dan ringan |
| **Database** | [PostgreSQL](https://www.postgresql.org/) | Relational Database Management System |
| **ORM** | [Prisma ORM](https://www.prisma.io/) | Type-safe database client, schema migrations & relations |
| **Autentikasi** | [Jose](https://github.com/panva/jose) & [Bcryptjs](https://github.com/dcodeIO/bcrypt.js) | JWT signing/verification & secure password hashing (salt 10) |
| **Validasi** | [Zod](https://zod.dev/) | Skema validasi data formulir dan API payload |
| **AI Engine** | Modular Multi-Provider | Google Gemini, OpenAI ChatGPT, Anthropic Claude, Ollama & Offline Expert Engine |

---

## 🎯 Fitur Utama

### 1. 🤖 AI Smart Diagnostic Assistant (`/dashboard/ai`)
- **Konsultasi Interaktif 24/7:** Pelanggan dapat menceritakan keluhan perangkat dan menerima analisa kemungkinan akar masalah secara terstruktur.
- **Troubleshooting Awal Mandiri:** Panduan langkah praktis yang aman untuk dicoba customer sebelum membawa ke lab.
- **Rekomendasi Layanan Servis IT:** Saran layanan servis dari katalog resmi lengkap dengan estimasi biaya dan durasi pengerjaan.
- **Official Disclaimer:** Peringatan resmi bahwa diagnosa AI adalah langkah awal dan bukan pengganti inspeksi teknisi.
- **Pesan Service Terintegrasi:** Tombol 1-klik untuk membuat pesanan servis dengan data keluhan yang terisi secara otomatis (*pre-filled*).
- **Arsitektur Modular:** Provider AI dapat diganti dengan mudah melalui environment variable (`AI_PROVIDER=expert|gemini|openai|anthropic|ollama`).

### 2. 🛡️ Keamanan & Hak Akses Berbasis Peran (RBAC)
- **Role ADMIN:** Mengelola antrian tiket servis global, membarui status pengerjaan, mencatat biaya final, dan mengelola katalog layanan.
- **Role CUSTOMER:** Mengajukan pesanan servis baru, berkonsultasi dengan AI, memantau riwayat garansi, dan melihat status perbaikan perangkat miliknya.
- **Isolasi Data Ketat:** Customer dijamin tidak dapat mengakses atau memodifikasi data customer lain di level database query maupun API route.
- **Proteksi Rute:** Next.js Edge Middleware & Server Guards (`requireAdmin`, `requireCustomer`) mencegah akses tidak sah.
- **Reset Password Aman:** Token stateless kriptografis 15 menit yang terikat dengan hash password aktif.

### 3. 📦 Pelacakan Tiket Servis Real-Time (`/track` & `/dashboard/tracking`)
- Pelacakan progres status perbaikan dari `CREATED` → `WAITING_CONFIRMATION` → `DEVICE_RECEIVED` → `CHECKING` → `IN_PROGRESS` → `WAITING_APPROVAL` → `COMPLETED` → `DELIVERED`.
- Riwayat linimasa (*status history*) dengan catatan teknisi dan stempel waktu.

---

## 📁 Struktur Folder Utama

```
it-service-management/
├── prisma/
│   ├── schema.prisma             # Skema Database PostgreSQL (User, Service, ServiceOrder, AIConversation, dll.)
│   └── seed.ts                   # Seeder data awal (Admin, Customer, dan Katalog Layanan IT)
├── public/                       # File aset statis dan favicon
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Layout & Rute Autentikasi
│   │   │   ├── login/page.tsx    # Halaman Login dengan Demo Credentials
│   │   │   ├── register/page.tsx # Halaman Pendaftaran Customer
│   │   │   ├── forgot-password/  # Permintaan Link Reset Sandi
│   │   │   └── reset-password/   # Ubah Sandi Baru dengan Token
│   │   ├── (dashboard)/
│   │   │   └── admin/            # Area Khusus Administrator
│   │   │       ├── dashboard/    # KPI Metrik, Antrian Servis, & Status Workshop
│   │   │       ├── orders/       # Manajemen Tiket & Status Pengerjaan
│   │   │       └── services/     # Manajemen Katalog Layanan IT
│   │   ├── dashboard/            # Area Khusus Pelanggan (Customer Portal)
│   │   │   ├── page.tsx          # Ringkasan Pesanan & Tracking Cepat
│   │   │   ├── ai/page.tsx       # Konsultasi AI Assistant & Chat History
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx      # Daftar Seluruh Pesanan Servis
│   │   │   │   ├── new/page.tsx  # Form Pembuatan Pesanan Servis Baru
│   │   │   │   └── [id]/page.tsx # Rincian Detail & Linimasa Tiket Servis
│   │   │   ├── history/page.tsx  # Riwayat Servis & Garansi
│   │   │   ├── tracking/page.tsx # Tracking Tiket Pelanggan
│   │   │   └── profile/page.tsx  # Pengaturan Profil & Ubah Sandi
│   │   ├── track/page.tsx        # Halaman Pelacakan Publik Tanpa Login
│   │   ├── api/                  # Backend REST API Endpoints
│   │   │   ├── ai/               # Endpoint Riwayat & Pesan AI Assistant
│   │   │   ├── auth/             # Login, Register, Logout, Reset Password
│   │   │   ├── orders/           # CRUD Pesanan Servis & Status Update
│   │   │   ├── services/         # CRUD Katalog Layanan
│   │   │   └── track/            # API Pelacakan Tiket
│   │   ├── globals.css           # Styling dasar, animasi, dan glassmorphism
│   │   ├── layout.tsx            # Root Layout dengan SEO & OpenGraph metadata
│   │   └── page.tsx              # Landing Page Terpadu
│   ├── components/
│   │   ├── admin/                # Komponen Khusus Admin (Table, Detail Manager, Service Form)
│   │   ├── ai/                   # Komponen AIConsultationChat
│   │   ├── landing/              # Komponen Landing Page (Hero, Services, Workflow, CTA, FAQ)
│   │   ├── layout/               # Navbar, Footer, AdminSidebar, CustomerSidebar
│   │   └── ui/                   # Reusable UI Components (Button, Input, Card, Badge, EmptyState, StatCard, etc.)
│   ├── lib/
│   │   ├── ai/                   # Modular AI Engine (ExpertEngine, Gemini, OpenAI, Claude, Ollama)
│   │   ├── auth.ts               # JWT Session, Reset Token, & Bcrypt Helpers
│   │   ├── prisma.ts             # Prisma Client singleton
│   │   ├── rbac.ts               # Server Guards (requireAdmin, requireCustomer)
│   │   ├── utils.ts              # Format Rupiah, Tanggal, & Classnames merger
│   │   └── validations/          # Zod Schemas (Auth, Order, Service)
│   ├── middleware.ts             # Next.js Edge Middleware untuk proteksi rute
│   └── types/                    # Definisi Type & Interface TypeScript
├── .env.example                  # Template konfigurasi environment
├── .env                          # Konfigurasi environment lokal
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🗺️ Daftar Route Aplikasi

### Halaman Web (Frontend)
| Route | Akses / Role | Deskripsi |
| :--- | :--- | :--- |
| `/` | Publik | Landing page dengan pengenalan layanan, alur servis, dan promo AI |
| `/track` | Publik | Pelacakan status tiket servis publik dengan nomor tiket (cth: `SRV-2026-0001`) |
| `/login` | Tamu (Guest) | Halaman masuk akun (tersedia tombol cepat Demo Login) |
| `/register` | Tamu (Guest) | Halaman pendaftaran akun pelanggan baru |
| `/forgot-password` | Tamu (Guest) | Permintaan tautan pemulihan kata sandi |
| `/reset-password` | Tamu (Guest) | Pembaharuan kata sandi menggunakan token |
| `/dashboard` | `CUSTOMER` | Customer Portal: ringkasan servis aktif, garansi, dan tracking |
| `/dashboard/ai` | `CUSTOMER` | AI Assistant: diagnosa kerusakan, troubleshooting, dan pesan service |
| `/dashboard/orders/new` | `CUSTOMER` | Formulir pemesanan perbaikan perangkat (drop-off / onsite) |
| `/dashboard/orders/[id]`| `CUSTOMER` / `ADMIN` | Rincian detail pesanan dan linimasa status pengerjaan |
| `/dashboard/history` | `CUSTOMER` | Arsip riwayat seluruh pesanan servis dan status garansi |
| `/dashboard/tracking` | `CUSTOMER` | Pencarian tiket servis internal customer |
| `/dashboard/profile` | `CUSTOMER` | Pengaturan profil pengguna dan perubahan kata sandi |
| `/admin/dashboard` | `ADMIN` | Admin Portal: statistik KPI, pesanan aktif, antrian pengerjaan |
| `/admin/orders` | `ADMIN` | Antrian tiket servis masuk dan pembaruan status pengerjaan |
| `/admin/services` | `ADMIN` | Manajemen katalog layanan, tarif biaya, dan durasi |

### REST API Endpoints
| Endpoint | Method | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | POST | Publik | Pendaftaran akun customer baru |
| `/api/auth/login` | POST | Publik | Verifikasi kredensial dan pembuatan session cookie |
| `/api/auth/forgot-password` | POST | Publik | Generasi token reset sandi berdurasi 15 menit |
| `/api/auth/reset-password` | POST | Publik | Verifikasi token kriptografis dan simpan password baru |
| `/api/auth/logout` | POST | Authenticated | Penghapusan session cookie (Logout) |
| `/api/services` | GET | Publik | Ambil daftar katalog layanan IT aktif |
| `/api/services` | POST | `ADMIN` | Tambah layanan IT baru ke katalog |
| `/api/services/[id]` | GET/PATCH/DELETE | `ADMIN` | Detail, edit tarif/deskripsi, atau hapus layanan |
| `/api/orders` | GET | Authenticated | Ambil daftar pesanan (Admin: semua, Customer: miliknya) |
| `/api/orders` | POST | `CUSTOMER` | Pembuatan pesanan servis baru |
| `/api/orders/[id]` | GET | Authenticated | Detail pesanan servis (diverifikasi kepemilikan) |
| `/api/orders/[id]` | PATCH | `ADMIN` | Pembaruan status pesanan, catatan teknisi, & harga final |
| `/api/ai/conversations` | GET/POST | `CUSTOMER` | Ambil riwayat atau buat sesi percakapan AI baru |
| `/api/ai/conversations/[id]` | GET/DELETE | `CUSTOMER` | Detail pesan atau hapus sesi percakapan AI |
| `/api/ai/conversations/[id]/messages` | POST | `CUSTOMER` | Kirim pertanyaan ke AI & simpan balasan |
| `/api/track` | GET | Publik | Cari status pesanan berdasarkan nomor tiket |

---

## 🚀 Panduan Instalasi & Menjalankan Project

### 1. Prasyarat Sistem
- **Node.js:** Versi 18.17.0 atau lebih tinggi
- **Database:** PostgreSQL versi 14 atau lebih baru

### 2. Kloning & Instalasi Dependensi
```bash
# Masuk ke direktori project
cd "c:/Users/bilbi/OneDrive/Documents/Projek RPL"

# Install dependensi menggunakan npm
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Buka file `.env` dan sesuaikan nilainya:
```env
# Koneksi Database PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/itsm_db?schema=public"

# Secret Key untuk Enkripsi JWT (Ganti dengan string acak yang kuat)
JWT_SECRET="itsm_super_secure_jwt_secret_key_2026_production_grade"

# Base URL Aplikasi
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Konfigurasi Provider AI Assistant
# Pilihan: expert (Default Offline), gemini, openai, anthropic, ollama
AI_PROVIDER="expert"
```

### 4. Setup Database & Migrasi Skema
Jalankan perintah Prisma untuk membuat tabel di PostgreSQL:
```bash
# Generate Prisma Client
npx prisma generate

# Sinkronisasi skema ke database PostgreSQL
npx prisma db push
```

### 5. Seeding Data Demo Awal
Jalankan seeder untuk mengisi akun demo Admin, Customer, serta katalog layanan IT awal:
```bash
npm run seed
```

**Kredensial Akun Demo:**
- **Akun Admin:**
  - Email: `admin@itservice.com`
  - Password: `Password123!`
  - Dashboard: `/admin/dashboard`
- **Akun Customer:**
  - Email: `customer@itservice.com`
  - Password: `Password123!`
  - Dashboard: `/dashboard`

### 6. Jalankan Server Development
```bash
npm run dev
```
Akses aplikasi melalui browser di: **`http://localhost:3000`**

---

## 🛡️ Jaminan Keamanan & Best Practices
- **Proteksi CSRF & XSS:** Session cookie berlabel `HttpOnly`, `SameSite=Lax`, dan `Secure` di lingkungan production.
- **SQL Injection Prevention:** Prisma ORM menggunakan query berparameter (*parameterized queries*).
- **Graceful AI Fallback:** Jika provider AI eksternal mengalami kendala kuota atau jaringan, sistem otomatis beralih ke `ExpertEngine` tanpa menimbulkan downtime bagi pengguna.
- **Data Sanitization:** Pelacakan publik via `/api/track` menyaring data kredensial dan informasi sensitif pengguna.
