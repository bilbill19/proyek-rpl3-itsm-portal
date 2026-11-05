# Naskah video - 01-progres-prd

Target 4 menit. Batas panduan: 3-5 menit

Petunjuk rekam: webcam aktif dan wajah terlihat sepanjang video; minimal 720p, disarankan 1080p; suara jelas. Gunakan naskah sebagai panduan, pahami penjelasannya. Waktu mencakup narasi dan tindakan layar, bukan janji durasi dari jumlah kata. Lakukan latihan stopwatch. Jangan menampilkan env, password, token atau data pelanggan nyata. Bagian berlabel PRASYARAT hanya boleh dinarasikan sebagai berhasil sesudah benar-benar diverifikasi. Bila belum, nyatakan keterbatasannya atau selesaikan dulu sebelum video pengumpulan.


## 00:00-00:35 | Identitas dan masalah

Aksi layar: Tampilkan cover PRD, webcam aktif.

Narasi: Perkenalkan, saya Bilbina Maharani, NIM 41257095. Proyek saya adalah ITSM Portal, aplikasi layanan servis perangkat berbasis web. Nama kelompok dan tema resmi saya cantumkan setelah dikonfirmasi. Masalah yang ingin diselesaikan adalah informasi servis yang tersebar: keluhan pelanggan, status perangkat, biaya dan percakapan konsultasi sulit ditelusuri dalam satu alur. Pelanggan membutuhkan kepastian langkah berikutnya, sedangkan admin membutuhkan data operasional yang konsisten.

## 00:35-01:15 | Tujuan dan aktor

Aksi layar: Buka bagian ruang lingkup; tunjukkan tamu, pelanggan dan admin.

Narasi: ITSM Portal mempunyai tiga kelompok pengguna. Tamu melihat katalog, melacak nomor tiket dan berkonsultasi awal dengan Mimo. Pelanggan masuk untuk membuat pesanan, melihat riwayat sendiri dan memakai Miko. Admin mengelola layanan, pesanan, akun, pelanggan, inventaris serta ringkasan operasional. Fokus aplikasi adalah alur servis dari pengajuan sampai perangkat diserahkan. Pembayaran daring dan penjadwalan teknisi terperinci belum termasuk fitur yang saya klaim tersedia.

## 01:15-02:05 | Kebutuhan fungsional

Aksi layar: Sorot FR04, FR05, FR06 dan FR07 pada PRD.

Narasi: Contoh kebutuhan utama adalah membuat pesanan. Sebagai pelanggan, saya memilih jenis perangkat, menulis keluhan dan menentukan apakah perangkat diantar atau teknisi datang ke lokasi. Kriteria penerimaannya terukur: keluhan minimal sepuluh karakter, alamat wajib untuk kunjungan, serta layanan yang dipilih harus aktif. Pelanggan hanya dapat melihat pesanannya sendiri. Admin dapat memperbarui status dan biaya, tetapi input harga negatif dan status sembarang harus ditolak. Tracking publik menampilkan ringkasan status, tanpa membuka alamat maupun catatan internal. Kriteria ini menjadi dasar pengujian, bukan hanya daftar fitur.

## 02:05-02:45 | Kebutuhan nonfungsional

Aksi layar: Tunjukkan daftar NFR dan bedakan target dari hasil uji.

Narasi: Dari sisi kualitas, sistem membutuhkan pengendalian akses di server, penyimpanan sandi dalam bentuk hash, serta rahasia yang tidak masuk repositori. Antarmuka ditargetkan dapat dipakai melalui keyboard dan pada layar ponsel. Target kinerja non-AI dan responsivitas masih harus diukur di lingkungan uji. Saya membedakan target kualitas dengan bukti yang sudah tersedia. Sebagai contoh, uji lokal atas akses pesanan dan validasi harga sudah dilakukan, tetapi itu belum membuktikan ketahanan sistem pada banyak pengguna secara bersamaan.

## 02:45-03:35 | Peran AI dan batasnya

Aksi layar: Buka spesifikasi AI; tunjukkan jalur Mimo, Miko dan fallback.

Narasi: AI membantu triase keluhan perangkat serta memberi langkah pemeriksaan awal. Mimo digunakan publik; Miko mempunyai konteks sesuai akun pelanggan atau admin. Integrasi NVIDIA dijalankan di server, bukan dengan membuka API key ke browser. Riwayat dan konteks outbound disaring untuk pola data sensitif tertentu. Ketika provider gagal, sistem dapat memakai ExpertEngine lokal dan harus menyebut label fallback secara jujur. Jawaban katalog atau jumlah pesanan tertentu bersifat deterministik. Saya tidak menyebut semua balasan sebagai inferensi AI eksternal, dan AI tidak menggantikan pemeriksaan fisik teknisi.

## 03:35-04:00 | Rencana dan risiko

Aksi layar: Tampilkan definisi selesai serta checklist eksternal.

Narasi: Tahap berikutnya menghubungkan kebutuhan dengan UML, rancangan UI, implementasi dan pengujian. Risiko yang masih perlu diselesaikan adalah peningkatan dependensi, pengujian database dan build, serta pembuktian AI live dan pipeline GitHub. Dokumen saya mencatat status tersebut secara terpisah. Dengan demikian, hasil proyek dapat ditelusuri dari kebutuhan sampai bukti pengujiannya.

## Pemeriksaan sebelum unggah

Latihan dengan stopwatch, rekam webcam sepanjang video, periksa audio dan keterbacaan layar. Unggah YouTube unlisted/public atau Drive Anyone with the link. Uji akses dari jendela tanpa login. Cantumkan URL nyata dalam README. Jangan menghapus penyebutan keterbatasan bila bukti belum ada.
