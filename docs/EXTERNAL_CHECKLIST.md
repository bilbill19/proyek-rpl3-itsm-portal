# Pekerjaan eksternal dan bukti yang masih dibutuhkan

1. Konfirmasi nama/NIM, kelas, kelompok dan tema resmi; perbarui README dan cover laporan.
2. Tingkatkan Next.js ke versi terpelihara sesuai advisori resmi; sesuaikan API async dan lockfile. Jalankan ulang seluruh uji; jangan publish baseline Next.js 14 ini.
3. Sediakan PostgreSQL uji terpisah; jalankan prisma generate, validate, migrate deploy, npm test, typecheck dan build. Jangan gunakan seed pada database berisi data penting.
4. Jalankan IT01-IT08 pada AUDIT_TESTING.md. Bukti harus mencatat waktu, lingkungan, input, hasil, dan rahasia disamarkan.
5. Buat Figma interactive prototype dari spesifikasi UI/UX dan prototype.html; hubungkan desktop/mobile dan share view. Prototipe HTML lokal tidak menggantikan persyaratan Figma.
6. Buat repo publik username/proyek-rpl-itsm-portal. Upload source bersih; jangan masukkan env asli, dump, node_modules atau log sensitif. Jalankan Actions, perbaiki semua gate dan isi URL run nyata.
7. Untuk delivery image, aktifkan Actions packages write dan environment production; workflow_dispatch publish_image=true hanya setelah verify lulus. Publikasi GHCR bukan bukti server live.
8. Siapkan hosting/container dan DB privat, TLS, secret runtime, migrasi satu kali, health/smoke test, backup/restore dan rollback. Catat URL live nyata jika sudah berjalan.
9. Isi NVIDIA_API_KEY di server lokal/hosting yang diizinkan, pilih model tersedia, uji kuota dan respons nvidia-nim. Jangan menyebut fallback lokal sebagai AI API live.
10. WhatsApp/email bersifat integrasi tambahan. Live WhatsApp butuh akun, token, template/izin dan opt-in; email recovery memerlukan implementasi sender serta verifikasi domain. Recovery saat ini 503.
11. Rekam tiga video 3-5, 5-7, 8-12 menit dengan webcam sepanjang presentasi dan audio jelas. Unggah YouTube/Drive, tes akses tanpa login dan isi tautan pada README.
12. Setelah verifikasi eksternal, revisi status laporan PDF dan unggah satu PDF serta repo ke LMS sesuai jadwal pertemuan 16. Jangan mengeklaim hasil lama sebagai uji terbaru.
