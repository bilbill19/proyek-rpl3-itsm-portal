# ITSM Portal - paket audit proyek akhir RPL

**Status:** 25 unit/handler tests lokal lulus dan typecheck lulus. Build produksi, migrasi database, AI live dan GitHub Actions belum terverifikasi. Baseline Next.js 14.2.35 memerlukan peningkatan sebelum publikasi.

## Identitas

- Nama: Bilbina Maharani
- NIM: 41257095
- Kelas: TI-KIP-1A-2025
- Kelompok dan Tema Topik Kelompok: RPL 3 & Bisnis
- Target repo: `bilbill19/proyek-rpl-itsm-portal` (repo publik belum dibuat)

## Aplikasi dan AI

Next.js App Router + React + TypeScript + Prisma/PostgreSQL. Modul katalog, pemesanan, status, pelanggan, akun, inventaris, notifikasi, Mimo publik dan Miko privat/admin. NVIDIA NIM dipanggil server-side; beberapa jawaban deterministik dan fallback ExpertEngine tidak membutuhkan API. Label provider aktual harus digunakan saat demo. Email recovery belum aktif dan memberi 503.

## Persiapan lokal

Gunakan Node.js 22, npm, PostgreSQL 16+ dan database khusus proyek. Jangan pakai database berisi data penting untuk demo/seed.

```sh
npm ci
```

Salin `.env.example` ke `.env` (Prisma CLI membaca `.env`; Next.js juga membacanya). Isi DATABASE_URL milik Anda dan JWT_SECRET random minimal 32 karakter. Contoh membuat secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Jangan commit hasilnya. Tanpa JWT_SECRET, autentikasi fail-closed.

```sh
npm run prisma:generate
npx prisma validate
npx prisma migrate deploy
npm run typecheck
npm test
npm run build
npm run dev
```

Aplikasi lokal: `http://localhost:3000`. Registrasi hanya membuat CUSTOMER. ADMIN pertama disediakan melalui seed **hanya pada DB disposable**, atau prosedur provisioning admin tepercaya oleh operator. Jangan membuka role admin lewat registrasi publik.

### Seed demo opsional - MENGHAPUS DATA

`npm run seed` menghapus data dan membuat akun demo. Kini wajib ALLOW_DEMO_RESET=true serta DEMO_PASSWORD minimal 12 karakter. Pastikan DATABASE_URL menunjuk DB uji kosong, set kedua variabel melalui shell lokal, lalu jalankan `npm run seed`. Akun demo admin: admin@itservice.com; customer: customer@itservice.com. Kata sandi berasal dari DEMO_PASSWORD. Jangan jalankan di produksi; jangan merekam secret pada video.

## Uji dan keterbatasan

`npm test` memakai Node test runner dan transpiler TypeScript lokal. Pengujian handler menggunakan mock Prisma/session/outbox; adapter NVIDIA memakai fetch pengganti. Ini bukan uji integrasi DB atau panggilan AI langsung. `npm run typecheck` melengkapi pemeriksaan tipe. `npm run lint` saat ini alias typecheck, bukan klaim audit ESLint.

Lihat `docs/evidence/unit-tests.txt`, `typecheck.txt`, `environment-limitations.txt`, `inventory.csv`, `routes.csv`, dan `traceability.csv`. Detail temuan: `docs/AUDIT_TESTING.md`. Bukti uji lama dari ZIP tidak dipromosikan sebagai hasil baru.

## CI dan continuous delivery

`.github/workflows/ci.yml` mengatur install bersih, Prisma, migrasi Postgres uji, typecheck, tests, build dan audit dependensi. Gate high/critical memang dapat gagal pada baseline lama sampai upgrade selesai. Workflow belum dijalankan di GitHub.

CD manual di main memublikasikan Docker image ke GHCR dengan tag commit SHA setelah verify lulus. Gunakan workflow_dispatch dan publish_image=true, environment production, GITHUB_TOKEN packages write. Publikasi image merupakan delivery artefak; belum mengaktifkan hosting live. Dockerfile memerlukan Next standalone output yang sudah diatur. Docker belum diuji lokal.

Untuk deploy: backup DB, jalankan migrate deploy dari checkout dengan Prisma CLI, lalu jalankan image memakai env runtime dan jaringan privat. Gunakan TLS reverse proxy. Rollback aplikasi memakai tag image sebelumnya; pemulihan DB mengikuti backup/restore yang diuji. Jangan menjadikan seed sebagai migrasi.

## Dokumen dan UI/UX

- PRD/SRS: `docs/PRD_SRS.md`
- SDD dan kamus data: `docs/SDD.md`
- 4 UML dan ERD: `docs/diagrams/` (SVG dan PlantUML editable)
- Prototipe interaktif lokal: buka `docs/uiux/prototype.html` di browser; data simulasi, bukan AI live atau Figma
- Laporan PDF tunggal tersedia sebagai deliverable terpisah dalam paket unduhan
- Pekerjaan akun eksternal: `docs/EXTERNAL_CHECKLIST.md`

## Tautan pengumpulan - belum tersedia

| Artefak | Status |
| --- | --- |
| Figma interactive prototype | Belum dibuat di akun Figma |
| Video Progres 1 (3-5 menit) | Naskah tersedia; belum direkam/diunggah |
| Video Progres 2 (5-7 menit) | Naskah tersedia; belum direkam/diunggah |
| Video Final (8-12 menit) | Naskah tersedia; demo live belum direkam |
| GitHub Actions run hijau | Belum dijalankan |
| URL live deployment | Belum tersedia |

Ganti status dengan URL nyata setelah berhasil. Video wajib webcam sepanjang presentasi, minimal 720p, audio jelas; final wajib demo aplikasi/AI langsung. Jangan gunakan badge hijau atau tautan contoh sebagai bukti.

## Referensi

- Panduan tugas proyek akhir RPL v4, Yudhistira Arie Wijaya, halaman 1-5 (lampiran pengguna).
- [Prisma error P2002](https://www.prisma.io/docs/orm/v6/reference/prisma-client-reference)
- [GitHub PostgreSQL service](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)
- [Advisori Next.js Mei 2026](https://vercel.com/changelog/next-js-may-2026-security-release)
- [Advisori Next.js Oktober 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026)

Paket ini hasil bantuan audit dan dokumentasi. Pemilik wajib memahami, menguji, dan mempertanggungjawabkan aplikasi secara individu sesuai panduan.
