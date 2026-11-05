# PRD / SRS - ITSM Portal

Versi audit 1.0 | 5 November 2026 | Bilbina Maharani, NIM 41257095. Identitas berasal dari chat rujukan; kelas, kelompok, dan tema resmi perlu dikonfirmasi pemilik.

## 1. Latar belakang dan tujuan

Permintaan servis perangkat, diagnosis awal, pemantauan pengerjaan, data pelanggan dan stok sering tersebar pada percakapan terpisah. ITSM Portal memusatkan proses tersebut dalam aplikasi web dengan portal pelanggan dan ruang kerja admin. AI membantu triase awal dan pencarian informasi operasional; keputusan diagnosis fisik dan biaya final tetap berada pada teknisi/admin.

Tujuan produk: pelanggan membuat permintaan terstruktur dan mengikuti status; admin memelihara katalog, pesanan, akun dan inventaris; Mimo membantu pertanyaan publik, Miko membantu konteks privat/operasional secara read-only.

## 2. Ruang lingkup, aktor, dan batas

Aktor: Tamu (katalog, tracking, chatbot publik); Customer (pemesanan, riwayat, konsultasi, notifikasi); Admin (operasional). Sistem eksternal: PostgreSQL, NVIDIA NIM dan provider AI opsional, WhatsApp Meta/Fonnte. Pembayaran daring, penjadwalan teknisi rinci, invoice fiskal, email reset otomatis dan Figma live tidak dianggap sudah tersedia.

Konteks akademik mengikuti panduan proyek akhir: kepemilikan aplikasi individu, tema kelompok sama, AI real-time, 4 UML, ERD, prototipe Figma, unit tests, GitHub Actions, PDF tunggal, dan tiga video. Dokumen ini menggunakan struktur kebutuhan yang selaras prinsip IEEE 830/ISO 29148; bukan sertifikasi kepatuhan standar.

## 3. Kebutuhan fungsional dan acceptance criteria

### FR01 - Registrasi pelanggan

Sebagai tamu saya dapat membuat akun pelanggan agar memiliki riwayat layanan.

Kriteria penerimaan: Nama, email dan konfirmasi sandi valid menghasilkan akun CUSTOMER; email sama ditolak; role dari input tidak digunakan.

Jejak implementasi: auth/register; validations/auth. Verifikasi: TC autentikasi live belum dijalankan.

### FR02 - Login dan sesi

Sebagai pengguna saya dapat masuk sesuai peran.

Kriteria penerimaan: Sandi salah ditolak; akun nonaktif ditolak; cookie HttpOnly dan SameSite Lax; produksi Secure; percobaan berlebih 429.

Jejak implementasi: auth/login; lib/auth; middleware. Verifikasi: Audit statis; uji HTTP perlu DB.

### FR03 - Katalog layanan

Sebagai tamu/pelanggan saya dapat melihat layanan aktif dan harganya.

Kriteria penerimaan: Layanan nonaktif tidak tampil bagi publik; admin dapat melihat semua; harga bersumber database.

Jejak implementasi: api/services; ServicesSection. Verifikasi: Audit statis.

### FR04 - Pemesanan servis

Sebagai pelanggan saya dapat memilih DROP_OFF atau ONSITE.

Kriteria penerimaan: ONSITE tanpa alamat ditolak; deskripsi minimal 10 karakter; layanan nonaktif ditolak; tiket dan history CREATED dibuat bersama nested write.

Jejak implementasi: api/orders; validations/order. Verifikasi: Unit ONSITE, retry tiket; E2E belum.

### FR05 - Detail pesanan privat

Sebagai pelanggan saya hanya dapat membuka pesanan sendiri.

Kriteria penerimaan: Tanpa sesi 401; pelanggan lain 403; admin dapat membaca; objek respons tidak mengandung password.

Jejak implementasi: api/orders/[id]. Verifikasi: Handler akses negatif dan respons aman lulus.

### FR06 - Tracking publik

Sebagai pemilik nomor tiket saya dapat memeriksa status ringkas.

Kriteria penerimaan: Nomor wajib diisi; tiket tidak ada 404; pembatas 20/menit; catatan bebas, alamat, foto, telepon dan problemDescription tidak dikembalikan.

Jejak implementasi: api/track; TrackingClient. Verifikasi: Handler catatan privat lulus; UI live belum.

### FR07 - Update pesanan admin

Sebagai admin saya memperbarui status, catatan dan biaya.

Kriteria penerimaan: Pelanggan ditolak; enum status valid; harga finite nonnegatif dengan maksimal 2 desimal; harga saja tidak menambah history status.

Jejak implementasi: api/orders/[id]; updateServiceOrderSchema. Verifikasi: Unit dan handler lulus.

### FR08 - Manajemen layanan

Sebagai admin saya mengelola katalog.

Kriteria penerimaan: Buat/edit/hapus menolak pelanggan; perubahan divalidasi; penonaktifan membatasi katalog publik.

Jejak implementasi: api/services; ServiceForm. Verifikasi: Audit statis; DB belum.

### FR09 - Pelanggan dan pengguna

Sebagai admin saya mengelola akun dan status aktif.

Kriteria penerimaan: Profil valid wajib; password dihash; respons profil tanpa hash; akun sendiri/admin aktif terakhir memiliki guard pada endpoint admin/users.

Jejak implementasi: api/customers; api/admin/users. Verifikasi: Audit statis; konflik admin paralel belum diuji.

### FR10 - Inventaris

Sebagai admin saya mencatat suku cadang.

Kriteria penerimaan: SKU unik; stok/minimum serta harga divalidasi; hanya admin mengakses; item rendah stok dapat diidentifikasi.

Jejak implementasi: api/inventory; validations/inventory. Verifikasi: Audit statis.

### FR11 - Mimo publik

Sebagai tamu saya dapat meminta panduan IT awal.

Kriteria penerimaan: Input maksimal 2000 karakter; maksimal 10 riwayat; konteks tanpa profil pribadi; provider aktual dikembalikan; gagal NVIDIA memakai fallback dengan label jujur.

Jejak implementasi: api/ai/chat; lib/ai/index; nvidia. Verifikasi: Adapter mock lulus; AI live belum.

### FR12 - Miko privat

Sebagai pelanggan saya dapat menyimpan konsultasi terkait kebutuhan sendiri.

Kriteria penerimaan: Percakapan diikat customerId sesi; user lain ditolak; pesan maksimal 2000; konteks pesanan difilter pemilik; outbound didesensitisasi.

Jejak implementasi: api/ai/conversations; pipeline; customer-context. Verifikasi: Audit statis; uji konteks dengan DB perlu dilakukan.

### FR13 - Miko operasional

Sebagai admin saya dapat membaca ringkasan operasional.

Kriteria penerimaan: Endpoint admin menolak customer; intent statistik memakai tool read-only; hasil katalog dan jumlah bersumber DB; tidak mengizinkan AI menulis data.

Jejak implementasi: api/ai/admin; knowledge/router; tools. Verifikasi: Audit statis.

### FR14 - Notifikasi

Sebagai pelanggan saya menerima kabar status.

Kriteria penerimaan: Notifikasi/outbox dibuat dalam transaksi perubahan status; read-all hanya milik sesi; WhatsApp membutuhkan enable/live/config/opt-in.

Jejak implementasi: notifications/service; whatsapp/dispatcher. Verifikasi: Audit statis; WhatsApp simulation/live belum dijalankan.

### FR15 - Pelaporan dan DevOps

Sebagai pengelola saya dapat mengulang pemeriksaan sebelum rilis.

Kriteria penerimaan: npm test dan typecheck tersedia; workflow memakai Postgres bersih; migrasi/build/audit menjadi gate; image hanya dipublikasikan manual setelah check.

Jejak implementasi: tests; .github/workflows/ci.yml; Dockerfile. Verifikasi: 25 tes lokal; Actions/container belum dieksekusi.

### FR16 - Pemulihan akun

Sebagai pengguna saya mendapat informasi pemulihan yang benar.

Kriteria penerimaan: Tanpa sender, endpoint memberi 503 umum tanpa bocorkan token/keberadaan email; admin membantu sesuai proses verifikasi identitas.

Jejak implementasi: auth/forgot-password. Verifikasi: Handler 503 lulus; email otomatis belum tersedia.

## 4. Kebutuhan nonfungsional

### NFR01 - Keamanan akses

100% endpoint mutasi sensitif memeriksa sesi/peran di server; uji negatif customer/admin sebelum rilis.

Status: Sebagian teruji: detail/update pesanan; sisanya audit statis.

### NFR02 - Privasi

Tidak ada password/token di JSON publik; catatan internal hanya untuk akun berwenang.

Status: Regresi password dan note lulus. Sanitizer regex bukan jaminan seluruh PII bebas.

### NFR03 - Kinerja

Target p95 endpoint non-AI <1 detik untuk 20 pengguna aktif pada lingkungan uji yang dicatat.

Status: Target, belum diukur; jangan gunakan sebagai hasil benchmark.

### NFR04 - Ketahanan AI

NVIDIA timeout 25 detik; kegagalan beralih ke ExpertEngine dan provider fallback terlihat.

Status: Timeout tampak di kode; mock menguji sukses/error, bukan latensi live.

### NFR05 - Integritas data

Harga sesuai Decimal(12,2), tiket unique, order/history konsisten; konflik diuji pada Postgres.

Status: Validasi/helper lulus; integrasi transaksi belum diverifikasi.

### NFR06 - Aksesibilitas

Target WCAG 2.2 AA: keyboard, fokus terlihat, label form, status bukan warna saja, kontras teks minimal 4.5:1.

Status: Spesifikasi UX; audit aksesibilitas aplikasi belum dilakukan.

### NFR07 - Responsivitas

Alur utama dapat digunakan pada lebar 375, 768, 1440 px tanpa scroll horizontal.

Status: Prototipe responsif disediakan; screenshot lama bukan bukti audit baru.

### NFR08 - Maintainability

Kebijakan harga tervalidasi satu skema; provider mengikuti interface; test dapat dijalankan tanpa API berbayar.

Status: 25 tes offline lulus. Monolit lib/ai/index masih kandidat refaktor bertahap.

### NFR09 - Operasional

Rahasia hanya runtime env; backup terenkripsi, uji restore, log tanpa PII, health dan error terpantau.

Status: Rencana deployment; backup/restore produksi belum diuji.

### NFR10 - Rilis

Dependency audit high/critical dan build wajib lulus sebelum image dipublikasi.

Status: Gate disediakan; peningkatan Next.js dan run GitHub masih diperlukan.

## 5. Spesifikasi AI utama

Input: teks masalah perangkat berbahasa Indonesia, konteks riwayat terbatas dan katalog/hasil query read-only yang diizinkan sesi. Output: penjelasan, langkah pemeriksaan aman, anjuran layanan relevan, serta label provider. Output AI tidak boleh dianggap hasil pemeriksaan perangkat atau janji harga/garansi yang mengikat.

Mimo publik mengutamakan NVIDIA NIM dengan fallback ExpertEngine; Miko diagnosis memilih provider menurut kode konfigurasi dan menggunakan pipeline berbasis peran. Sapaan, identitas, katalog dan statistik tertentu dijawab deterministik. Karena itu tidak setiap balasan adalah inferensi model eksternal. Mode expert/fallback tidak memenuhi bukti demo AI API real-time pada panduan.

Adapter NVIDIA menggunakan endpoint chat-completions server-side, timeout 25 detik, temperatur 0.4, max_tokens 1200. Key tidak dikirim ke browser. Sanitasi outbound menghapus pola email, telepon Indonesia dan secret tertentu; nama/alamat dalam teks bebas tetap berpotensi lolos. Pengguna perlu diberi informasi pemrosesan pihak ketiga sebelum produksi.

Evaluasi AI yang direncanakan: minimal 20 kasus perangkat/jaringan, 5 out-of-domain, 5 prompt injection, 5 status tiket lintas akun. Catat provider, relevansi, kebocoran, waktu respons, dan ketepatan katalog. Hasil live belum tersedia; pengujian adapter dengan fetch pengganti hanya memverifikasi kontrak.

## 6. Asumsi dan risiko

PostgreSQL tersedia dan schema sesuai migrasi; JWT random panjang dikonfigurasi; akun NVIDIA memiliki izin/kuota; reverse proxy menimpa header IP agar rate limit tidak mudah dipalsukan. Pembatas berbasis memori direset saat restart dan tidak dibagi antar instance. Deploy publik ditunda sampai Next.js ditingkatkan, integrasi dan build lulus.

## 7. Definisi selesai

Dokumen dan diagram konsisten dengan kode; unit/typecheck lulus; migrasi DB bersih dan alur HTTP utama teruji; AI API real-time terbukti; prototipe Figma dapat diklik; Actions hijau di repo publik; README berisi identitas dan tiga tautan video yang dapat diakses. Paket audit ini memenuhi hasil lokal yang tercatat, tetapi belum memenuhi seluruh bukti eksternal tersebut.
