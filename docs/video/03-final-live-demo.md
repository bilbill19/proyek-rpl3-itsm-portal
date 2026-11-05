# Naskah video - 03-final-live-demo

Target 10 menit. Batas panduan: 8-12 menit

Petunjuk rekam: webcam aktif dan wajah terlihat sepanjang video; minimal 720p, disarankan 1080p; suara jelas. Gunakan naskah sebagai panduan, pahami penjelasannya. Waktu mencakup narasi dan tindakan layar, bukan janji durasi dari jumlah kata. Lakukan latihan stopwatch. Jangan menampilkan env, password, token atau data pelanggan nyata. Bagian berlabel PRASYARAT hanya boleh dinarasikan sebagai berhasil sesudah benar-benar diverifikasi. Bila belum, nyatakan keterbatasannya atau selesaikan dulu sebelum video pengumpulan.


## 00:00-00:45 | Pitch dan status

Aksi layar: Tampilkan identitas, README dan status uji.

Narasi: Saya Bilbina Maharani, NIM 41257095. ITSM Portal menghubungkan pelanggan yang membutuhkan servis perangkat dengan admin yang mengelola pekerjaan. Pada demo ini saya akan menunjukkan pemesanan, pemantauan status, konsultasi AI dan pengujian. Saya membedakan bukti lokal dari layanan eksternal. Sebelum rekaman pengumpulan, pastikan database, build, NVIDIA dan GitHub Actions benar-benar siap. Jika ada tahap belum berhasil, saya akan menjelaskan keterbatasannya dan tidak mengganti bukti live dengan screenshot.

## 00:45-01:30 | Arsitektur

Aksi layar: Buka SDD dan source root; jangan buka env.

Narasi: Frontend dibangun dengan React pada Next.js. Backend berada pada route handler, menggunakan Prisma dan PostgreSQL. Cookie JWT dipakai untuk sesi, lalu data akun diambil ulang dari database agar perubahan peran dan status aktif berlaku. Akses pesanan dan percakapan diperiksa berdasarkan pemilik. Modul AI dipisahkan dari UI dan memanggil NVIDIA dari server. Notifikasi dibuat bersama perubahan status dalam transaksi, sedangkan pengiriman WhatsApp ditempatkan di luar transaksi agar gangguan jaringan tidak membatalkan pekerjaan utama.

## 01:30-02:45 | Demo pelanggan

Aksi layar: PRASYARAT: aplikasi + DB berjalan. Login customer demo, buka katalog, buat ONSITE tanpa alamat, koreksi, submit. Jangan sebut sukses sebelum melihat respons.

Narasi: Saya masuk sebagai pelanggan pada database demo yang terpisah dari data nyata. Katalog menunjukkan layanan aktif. Sekarang saya membuat pesanan, memilih laptop, menulis merek dan menjelaskan keluhan. Saya memilih kunjungan teknisi tetapi mencoba mengirim tanpa alamat. Validasi seharusnya menolak tindakan tersebut. Setelah alamat diisi, saya mengirim ulang dan memeriksa nomor tiket serta status awal yang benar-benar dikembalikan aplikasi. Nomor tiket dan history awal harus tersimpan konsisten. Jika muncul galat, saya berhenti menjelaskan keberhasilan dan menunjukkan hasil aktual. Setelah berhasil, saya membuka detail pesanan agar alur pelanggan terlihat utuh.

## 02:45-03:45 | Demo admin dan privasi

Aksi layar: Login admin di browser/sesi terpisah, ubah status dan harga; kembali ke customer; buka tracking publik.

Narasi: Pada akun admin, saya membuka pesanan yang baru dibuat, memberi status pengerjaan dan biaya yang sesuai. Harga negatif harus ditolak. Ketika hanya harga diubah, sistem tidak boleh menambah riwayat status palsu. Saya kemudian melihat kembali detail pada akun pelanggan untuk memastikan perubahan benar-benar terbaca. Tracking publik dipisahkan dari detail privat. Status ringkas boleh muncul, tetapi alamat, foto dan catatan internal tidak boleh terbuka. Catatan admin yang bebas dapat memuat informasi sensitif, sehingga respons publik sekarang mengosongkan catatan tersebut. Saya juga tidak menampilkan JSON yang berisi kredensial pada rekaman.

## 03:45-05:15 | AI API real-time

Aksi layar: PRASYARAT: NVIDIA key valid di server. Kirim diagnosis non-sapaan; lihat provider aktual tanpa key. Tunggu respons live; gunakan waktu tindakan.

Narasi: Saya membuka konsultasi Miko dan mengirim masalah perangkat yang membutuhkan diagnosis awal, bukan sekadar sapaan atau pertanyaan harga. Contohnya, laptop sering mati saat beban tinggi walaupun adaptor terpasang. Saya mengirim pesan sekarang dan menunggu respons langsung. Pada aplikasi, saya memastikan provider yang benar-benar dipakai. Hanya jika hasil menunjukkan nvidia-nim dan request berhasil, saya menjelaskan bahwa jawaban berasal dari API eksternal secara real-time. Balasan berupa pemeriksaan awal dan anjuran layanan, bukan kepastian diagnosis fisik. Jika sistem menampilkan expert-fallback atau jawaban deterministik, saya menjelaskannya sesuai label. Fallback menjaga kegunaan aplikasi saat API bermasalah, tetapi tidak menggantikan bukti integrasi model live yang diminta panduan. Saya juga memastikan percakapan tersimpan pada akun sendiri dan tidak membuka data pengguna lain. Selama menunggu, saya jelaskan bahwa server membatasi riwayat dan menyaring pola email, telepon serta secret sebelum request keluar. Penyaringan regex mempunyai keterbatasan untuk nama dan alamat dalam teks bebas.

## 05:15-06:00 | Batas AI dan data

Aksi layar: Coba pertanyaan di luar scope; tunjukkan perilaku aktual. Jangan sengaja memicu biaya berulang.

Narasi: Saya menguji satu permintaan yang tidak sesuai domain layanan, kemudian melihat apakah sistem menolak secara tepat. AI portal difokuskan pada perangkat, software, jaringan dan layanan servis. Data statistik admin berasal dari tool read-only, bukan angka karangan model. Harga layanan sebaiknya mengikuti katalog database. Saya tidak memberikan AI kewenangan mengubah pesanan atau akun. Pengujian adversarial yang lebih luas tetap diperlukan karena satu contoh penolakan belum membuktikan semua prompt injection dapat dicegah.

## 06:00-07:10 | Unit tests dan batas bukti

Aksi layar: Jalankan npm test dan npm run typecheck. Tunjukkan hasil aktual.

Narasi: Sekarang saya menjalankan pengujian otomatis. Paket audit menyediakan dua puluh lima kasus, meliputi validasi harga dan status, alamat kunjungan, pembatas permintaan, sanitasi, retry tiket, akses order, respons tanpa password dan penyembunyian catatan publik. Ada pula pengujian kontrak adapter NVIDIA. Perhatikan bahwa pengujian handler memakai pengganti Prisma, sesi dan outbox, sedangkan pengujian provider memakai fetch pengganti. Jadi hasil ini membuktikan perilaku pada batas yang diuji, bukan koneksi ke database maupun inferensi NVIDIA nyata. TypeScript diperiksa terpisah. Saya menunjukkan jumlah lulus dan exit status aktual, lalu membandingkannya dengan bukti pengujian integrasi yang sudah saya jalankan di lingkungan demo.

## 07:10-08:10 | CI/CD GitHub

Aksi layar: PRASYARAT: repo publik dan run nyata. Buka Actions run terbaru, commit SHA, langkah dan artifact. Jika belum, sebut konfigurasi belum dieksekusi.

Narasi: Workflow GitHub Actions disiapkan untuk instalasi bersih, Prisma generate dan validate, migrasi pada PostgreSQL uji, typecheck, unit tests, build serta audit dependensi. Saya membuka run yang sesuai commit demo dan memeriksa semua langkahnya. Hanya jika benar-benar berhasil saya menyebut pipeline hijau. Baseline Next.js empat belas memerlukan peningkatan sebelum rilis, sehingga dependency gate tidak boleh dilewati untuk mempercantik presentasi. Continuous delivery manual memublikasikan image dengan tag commit SHA sesudah verifikasi. Image tersebut merupakan artefak siap dipindahkan ke server; keberadaan image sendiri belum membuktikan hosting live. Saya menunjukkan bukti deployment terpisah bila sudah tersedia.

## 08:10-09:05 | Temuan audit dan risiko

Aksi layar: Buka AUDIT_TESTING serta patch; sorot 3 perbaikan inti.

Narasi: Perbaikan paling penting dari audit ini adalah pembatasan objek pelanggan pada respons update pesanan, penyembunyian catatan admin di tracking publik, dan validasi harga serta status. Pengaman seed juga ditambahkan karena proses demo sebelumnya menghapus data tanpa konfirmasi. Pemulihan email tidak lagi mengaku mengirim pesan ketika sender belum tersedia. Untuk risiko yang belum selesai, saya mencatat peningkatan framework, update status paralel, pembatas lintas instance, pengujian database, dan pengujian UI. Saya tidak menganggap paket dokumen sebagai bukti bahwa semua risiko produksi sudah hilang.

## 09:05-10:00 | Refleksi dan pengumpulan

Aksi layar: Tampilkan PRD -> UML -> code -> tests -> README tautan nyata; jangan tampilkan placeholder sebagai link berhasil.

Narasi: Pelajaran utama saya adalah kebutuhan harus mempunyai kriteria yang dapat diuji. Diagram membantu menjelaskan siapa yang boleh melakukan tindakan, bagaimana konteks AI dibatasi dan kapan data disimpan. Pengujian harus menyebut batasnya, khususnya perbedaan unit test, integrasi database dan layanan AI live. Saya juga belajar bahwa konfigurasi pipeline tidak sama dengan pipeline yang sudah berjalan. Untuk pengumpulan, README harus memuat identitas, tema kelompok, petunjuk instalasi dan tiga tautan video yang dapat diakses. Laporan tunggal menggabungkan kebutuhan, desain, UI/UX serta hasil pengujian dengan status yang jujur. Saya siap menjelaskan implementasi dan alasan keputusan desain secara mandiri.

## Pemeriksaan sebelum unggah

Latihan dengan stopwatch, rekam webcam sepanjang video, periksa audio dan keterbacaan layar. Unggah YouTube unlisted/public atau Drive Anyone with the link. Uji akses dari jendela tanpa login. Cantumkan URL nyata dalam README. Jangan menghapus penyebutan keterbatasan bila bukti belum ada.
