# Naskah video - 02-progres-uml-uiux

Target 6 menit. Batas panduan: 5-7 menit

Petunjuk rekam: webcam aktif dan wajah terlihat sepanjang video; minimal 720p, disarankan 1080p; suara jelas. Gunakan naskah sebagai panduan, pahami penjelasannya. Waktu mencakup narasi dan tindakan layar, bukan janji durasi dari jumlah kata. Lakukan latihan stopwatch. Jangan menampilkan env, password, token atau data pelanggan nyata. Bagian berlabel PRASYARAT hanya boleh dinarasikan sebagai berhasil sesudah benar-benar diverifikasi. Bila belum, nyatakan keterbatasannya atau selesaikan dulu sebelum video pengumpulan.


## 00:00-00:35 | Pembukaan dan arsitektur

Aksi layar: Tampilkan SDD dan diagram lapisan.

Narasi: Pada video kedua saya menjelaskan rancangan ITSM Portal. Browser React berkomunikasi dengan Next.js App Router. Route handler menggunakan Prisma untuk membaca dan menulis PostgreSQL, serta memanggil provider AI dari server. Aplikasi ini merupakan satu aplikasi web modular, bukan kumpulan microservice. Empat diagram UML menjelaskan tujuan pengguna, alur kegiatan, struktur provider dan urutan pesan pada sistem yang sama.

## 00:35-01:30 | Use Case

Aksi layar: Buka 01-use-case.svg; telusuri hubungan aktor.

Narasi: Pada Use Case Diagram, tamu dapat mendaftar, melihat katalog, melakukan tracking ringkas dan memakai Mimo. Pelanggan dapat membuat pesanan, mengakses detailnya sendiri, berkonsultasi dengan Miko serta membaca notifikasi. Admin mengelola data operasional dan memperoleh ringkasan internal. Hubungan dengan NVIDIA menunjukkan layanan eksternal yang mendukung konsultasi. Satu skenario penting adalah pemesanan ONSITE. Kondisi awalnya pelanggan telah login. Pelanggan mengisi perangkat, keluhan dan alamat; sistem memvalidasi, mengecek layanan aktif, membuat nomor tiket serta status awal. Jika alamat kurang lengkap, proses berhenti dengan kesalahan validasi sebelum data disimpan.

## 01:30-02:25 | Activity

Aksi layar: Buka 02-activity.svg; jelaskan keputusan dan cabang gagal.

Narasi: Activity Diagram berfokus pada konsultasi Miko. Pesan masuk diperiksa dari sisi sesi, kepemilikan, format dan pembatas permintaan. Jika gagal, sistem mengembalikan status yang sesuai. Jika valid, pesan pengguna disimpan, kemudian pipeline memeriksa cakupan dan peran. Pertanyaan katalog atau operasional tertentu dapat dijawab langsung dari data yang diizinkan. Bila perlu inferensi model, data outbound disaring sebelum dikirim. Keberhasilan provider menghasilkan jawaban AI, sedangkan kegagalan beralih ke fallback lokal. Balasan disimpan dan ditampilkan dengan provider aktual. Cabang ini penting agar kegagalan layanan eksternal tidak disamarkan sebagai keberhasilan AI live.

## 02:25-03:20 | Class dan SOLID

Aksi layar: Buka 03-class.svg lalu tunjukkan interface di kode.

Narasi: Class Diagram mengikuti struktur kode yang benar-benar ada. AIProviderInterface mendefinisikan nama dan metode generateResponse. NvidiaNimProvider, ExpertEngineProvider serta provider lain mengimplementasikan kontrak tersebut. Dengan kontrak ini, pipeline bergantung pada perilaku provider, sehingga perubahan adapter tidak harus mengubah seluruh antarmuka. Modul auth, customer-context dan Prisma ditandai sebagai modul, karena implementasinya bukan kelas aplikasi berorientasi objek. Pemisahan validasi, retry tiket, konteks dan provider mendukung tanggung jawab yang lebih jelas. Namun saya tidak mengklaim seluruh kode sempurna SOLID; modul AI yang besar masih dapat direfaktor bertahap.

## 03:20-04:15 | Sequence

Aksi layar: Buka 04-sequence.svg; telusuri frontend/backend/DB/API.

Narasi: Sequence Diagram memperlihatkan urutan pesan pertama konsultasi. Frontend mengirim permintaan ke backend. Backend mengambil sesi dan akun aktif dari PostgreSQL. Permintaan yang tidak valid berhenti sebelum proses berikutnya. Untuk permintaan valid, percakapan dan pesan pengguna disimpan. Backend membentuk konteks sesuai pemilik dan peran. Bila jalurnya memerlukan NVIDIA, permintaan yang sudah disaring dikirim ke API. Balasan sukses diteruskan; galat atau timeout memakai ExpertEngine. Backend kemudian menyimpan pesan asisten dan mengirim percakapan beserta provider ke frontend. Ini menjelaskan perbedaan panggilan database, pemrosesan lokal dan request ke layanan eksternal.

## 04:15-04:55 | ERD

Aksi layar: Buka ERD dan kamus data; sorot FK serta Decimal.

Narasi: ERD memuat sebelas model aktual. User memiliki banyak pesanan dan percakapan. Pesanan terhubung dengan layanan yang opsional, serta mempunyai riwayat status. Percakapan mempunyai banyak pesan. Notifikasi, preferensi dan riwayat WhatsApp terhubung ke pengguna. InventoryItem berdiri sendiri. Outbox menyimpan payload teks JSON dan tidak memiliki foreign key ke pesanan. Harga menggunakan Decimal dua angka di belakang koma. Keunikan email, nomor tiket dan SKU menjaga integritas, tetapi tetap memerlukan penanganan konflik pada kode.

## 04:55-06:00 | Walkthrough UI/UX

Aksi layar: PRASYARAT pengumpulan: buka Figma nyata. Untuk review paket lokal, buka prototype.html dan sebutkan belum Figma. Klik ONSITE tanpa alamat, lengkapi, kirim, buka detail.

Narasi: Rancangan UI mengutamakan status dan tindakan berikutnya. Dashboard pelanggan menampilkan pesanan aktif, lalu tombol membuat pesanan dan konsultasi. Pada form, alamat hanya muncul untuk metode kunjungan teknisi. Saya tunjukkan keadaan input salah terlebih dahulu, lalu memperbaikinya dan membuka detail tiket. Detail menampilkan perjalanan status dan akses konsultasi. Ruang admin menyediakan perubahan status dan biaya. Prototipe lokal ini memakai data simulasi dan bukan AI live. Untuk memenuhi panduan, alur desktop dan mobile perlu disusun serta dihubungkan dalam Figma, kemudian tautan nyata dicantumkan pada README. Navigasi keyboard, label form dan pengujian pengguna tetap harus diverifikasi sebelum saya mengklaim kualitas aksesibilitasnya.

## Pemeriksaan sebelum unggah

Latihan dengan stopwatch, rekam webcam sepanjang video, periksa audio dan keterbacaan layar. Unggah YouTube unlisted/public atau Drive Anyone with the link. Uji akses dari jendela tanpa login. Cantumkan URL nyata dalam README. Jangan menghapus penyebutan keterbatasan bila bukti belum ada.
