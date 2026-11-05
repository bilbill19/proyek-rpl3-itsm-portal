# Audit dan laporan pengujian

## Metode dan cakupan

Arsip asli dipertahankan di lokasi pengguna. Salinan kerja dibuat tanpa .env.local/.env.txt, dump database, backup nomor, .git, .next dan log runtime. node_modules dari ZIP hanya dipakai lokal untuk pemeriksaan; tidak dimasukkan paket hasil.

Seluruh file src diinventarisasi dan dipindai secara statis untuk imports, route handler, sesi/peran, akses Prisma, fetch dan pola respons. Penelaahan terperinci difokuskan pada batas autentikasi, order, tracking, AI, pelanggan, seed dan notifikasi. Ini audit berbasis risiko, bukan bukti bahwa setiap perilaku setiap baris bebas bug. Lampiran inventory.csv dan routes.csv memberikan cakupan yang bisa ditelusuri.

Bukti lama di audit_miko_customer dan bukti_polish_ui tidak dianggap hasil uji baru. Tidak menggunakan kredensial dalam ZIP dan tidak menyentuh database aplikasi pengguna.

## Temuan dan tindak lanjut

### A01 [Tinggi] Hash kata sandi ikut respons PATCH pesanan

Bukti awal: orders/[id]/route.ts: include customer:true.

Hasil/tindak lanjut: Dua query memakai select aman; regresi handler lulus.

### A02 [Tinggi] Catatan bebas admin terbuka pada tracking publik

Bukti awal: track/route.ts: note:h.note.

Hasil/tindak lanjut: Catatan publik null; detail terautentikasi tetap tersedia.

### A03 [Tinggi] Harga/status PATCH tidak divalidasi

Bukti awal: orders/[id]/route.ts: cast status dan Number(input).

Hasil/tindak lanjut: Zod membatasi enum, tipe, angka finite, nonnegatif, 2 desimal, panjang catatan, dan field tak dikenal.

### A04 [Sedang] Perubahan harga saja menambah riwayat status palsu

Bukti awal: status undefined !== existingOrder.status.

Hasil/tindak lanjut: History hanya dibuat bila status disertakan dan berubah atau catatan terisi.

### A05 [Sedang] Pembuatan nomor tiket rentan benturan paralel

Bukti awal: count lalu check lalu create bukan operasi atomik.

Hasil/tindak lanjut: Unique index DB dipertahankan; retry khusus P2002 ticketNumber maksimal 8 percobaan. Uji helper lulus; paralel DB belum diuji.

### A06 [Sedang] Layanan nonaktif/ID tidak ada dapat dipesan

Bukti awal: orders POST tidak menolak service nonaktif.

Hasil/tindak lanjut: Layanan tidak tersedia ditolak 400; pembuatan dibatasi CUSTOMER.

### A07 [Tinggi] Seed menghapus data tanpa konfirmasi dan memakai sandi tetap

Bukti awal: prisma/seed.ts deleteMany dan password literal.

Hasil/tindak lanjut: Guard ALLOW_DEMO_RESET + DEMO_PASSWORD minimal 12 karakter. Tidak dijalankan terhadap data pengguna.

### A08 [Sedang] NVIDIA jalur publik belum menyaring PII

Bukti awal: sanitizer sebelumnya hanya jalur diagnosis.

Hasil/tindak lanjut: Sanitasi ditempatkan juga pada adapter NVIDIA; request fetch pengganti diuji.

### A09 [Sedang] Login tidak membatasi percobaan

Bukti awal: auth/login POST.

Hasil/tindak lanjut: Pembatas 10/menit per IP per proses; bukan perlindungan terdistribusi.

### A10 [Sedang] Email pemulihan diklaim terkirim tanpa sender

Bukti awal: forgot-password TODO pengiriman email.

Hasil/tindak lanjut: Respons 503 yang sama untuk semua email; tanpa token; UI menjelaskan layanan belum tersedia.

### A11 [Sedang] Input percakapan internal tidak dibatasi panjang

Bukti awal: ai/conversations dan messages.

Hasil/tindak lanjut: Judul 120 karakter, pesan 2000 karakter; JSON rusak ditolak/diproses sebagai input kosong.

### A12 [Sedang] Endpoint profil pelanggan menerima tipe arbitrer

Bukti awal: customers/[id] PATCH.

Hasil/tindak lanjut: Skema ketat memvalidasi nama/email/telepon/password sebelum penulisan.

### A13 [Sedang] Contoh JWT secret siap pakai dan arsip sensitif

Bukti awal: env template, dump, .env.local dalam ZIP.

Hasil/tindak lanjut: Template JWT kosong, aturan ignore diperluas; arsip hasil tidak memuat env lokal, dump, log lama, backup data atau node_modules.

### R01 [Penghambat rilis] Next.js 14.2.35 memerlukan peningkatan

Bukti awal: lockfile dan advisori resmi 7 Mei / 14 Oktober 2026.

Hasil/tindak lanjut: Belum diubah: akses registry fetch failed. Migrasi ke versi terpelihara beserta uji wajib sebelum publikasi.

### R02 [Terbuka] Status akun/role di middleware dapat usang

Bukti awal: JWT middleware vs sesi DB di layout.

Hasil/tindak lanjut: Layout dan API memeriksa sesi DB; uji UX token akun nonaktif/perubahan role belum dilakukan. Hindari klaim bebas redirect loop.

### R03 [Terbuka] Workflow, container, database dan AI live belum diverifikasi

Bukti awal: Pembatasan lokal dan akun eksternal.

Hasil/tindak lanjut: Dibedakan dari 25 unit/handler tests. Tidak ada klaim Actions hijau atau deployment live.

### R04 [Terbuka] Update status paralel/outbox belum diuji dengan DB

Bukti awal: Pembacaan status sebelum transaksi.

Hasil/tindak lanjut: Diperlukan uji konflik dan idempotensi multi-proses; tidak mengklaim exactly-once delivery WhatsApp.

## Hasil pemeriksaan sesi ini

25 pengujian otomatis Node.js: skema order/uang, alamat ONSITE, enum/status, field tak dikenal, sanitasi PII/secret, pembatas per pengguna, normalisasi nomor, retry tiket bounded, hak akses detail/update, history harga saja, password tidak bocor, catatan publik disembunyikan, recovery 503, serta kontrak adapter NVIDIA dengan fetch pengganti. Prisma/session/outbox pada pengujian handler adalah test double yang eksplisit. Tidak ada klaim integrasi DB dari tes tersebut.

TypeScript baseline ZIP: exit 0. Setelah perubahan, dua perbandingan harga dengan string ditemukan oleh compiler dan diperbaiki; pemeriksaan akhir dicatat di evidence/typecheck.txt. Test runner mentranspilasi TS untuk eksekusi; typecheck dijalankan terpisah agar kesalahan tipe tidak tersembunyi.

Build produksi sempat dijalankan: Next.js 14.2.35 gagal karena EPERM mkdir .next/server/app/api/admin. Ini kegagalan pemeriksaan, bukan build sukses. Perubahan Docker/standalone selanjutnya belum dapat divalidasi dengan build penuh. Tidak ada klaim siap deployment.

Database uji terpisah diinisialisasi; percobaan koneksi ke 127.0.0.1:55438 ditolak dengan Permission denied (10013), sehingga createdb/migrate deploy tidak berhasil. Tidak ada data aplikasi asli yang diubah. Proses database uji tidak bertahan antar perintah; penghentian mendapat No such process.

Registry npm: fetch metadata next/15.5.28 gagal (fetch failed). Kebijakan lingkungan tidak mengizinkan eskalasi perintah. Dependency upgrade belum diterapkan. Advisori resmi menyatakan 14.x memerlukan peningkatan; rilis publik harus menunggu remediasi dan uji.

Tidak dieksekusi: npm ci bersih dari jaringan, npm audit live, Docker build, Actions GitHub, Figma live, AI NVIDIA real-time, WhatsApp live, video aktual, hosting publik, load testing, backup/restore. Jangan mengganti label ini menjadi lulus sebelum ada bukti.

## Rencana pengujian integrasi penerimaan

IT01 Database kosong: migrate deploy seluruh migrasi; validate schema; buat akun demo hanya pada DB disposable. IT02 Login ADMIN/CUSTOMER dan salah sandi; akun nonaktif ditolak. IT03 Buat DROP_OFF dan ONSITE, layanan nonaktif ditolak; 20 request paralel tiket harus unik dan semua respons dilacak.

IT04 Akses order/percakapan customer lain harus ditolak; ubah role dan nonaktifkan akun saat cookie lama masih ada; pastikan UI dapat logout/login kembali. IT05 Update harga/status/catatan valid dan invalid; simulasikan rollback notifikasi/outbox; update paralel; cek tidak ada hash/password di seluruh respons.

IT06 Dengan NVIDIA key valid, kirim pertanyaan diagnosis non-sapaan, pastikan provider nvidia-nim dan balasan real-time; putuskan jaringan/invalid key untuk fallback; cek input PII dan prompt injection. Simpan bukti tersanitasi tanpa header Authorization.

IT07 WhatsApp default disabled, simulation, opt-out, opt-in dan live test ke nomor sendiri yang diizinkan; cek duplicate timeout/restart. IT08 Upload repo publik, Actions berjalan, artifact image dibuat manual, lakukan smoke test deploy, rollback image dan pemulihan DB.

## Matriks kesesuaian panduan

Tahap 1: PRD/SRS tersedia pada Markdown dan PDF terintegrasi; naskah video target 4 menit tersedia, video belum direkam. Tahap 2: empat UML, ERD, data dictionary dan UI prototype lokal tersedia; Figma interaktif belum dipublikasi; naskah 6 menit tersedia.

Tahap 3: source diperbaiki dan unit test tersedia; typecheck lokal lulus; workflow CI/CD disiapkan; migrasi/build tidak lulus di lingkungan ini; Actions hijau belum ada. Tahap 4: laporan PDF tunggal dan naskah final 10 menit tersedia; live AI/demo/video dan unggah LMS perlu pengguna/akun eksternal.

Panduan menuntut wajah terlihat sepanjang rekaman, minimal 720p (disarankan 1080p), audio jelas, tautan YouTube unlisted/public atau Drive Anyone with the link di README. Final wajib demo aplikasi dan AI langsung, bukan hanya slide/screenshot.

## Kepemilikan dan integritas akademik

Mahasiswa wajib memahami dan mempertanggungjawabkan implementasi individu. Bantuan audit ini tidak menjadi bukti riwayat pengembangan pribadi, wawancara pengguna, commit historis atau pengujian live yang tidak dilakukan. Jangan merekayasa tanggal commit, skor usability, tautan video, Figma atau badge CI hijau.
