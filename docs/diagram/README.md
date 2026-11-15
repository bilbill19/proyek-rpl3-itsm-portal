# Diagram ITSM Portal

Dokumentasi ini memuat ERD final hasil audit Prisma dan sepuluh sequence diagram yang diaudit terhadap alur aplikasi.

## Daftar berkas

- [ERD (11 entitas)](ERD.md)
- [Customer Membuat Service Order](sequence-01.md)
- [Admin Memproses Service Order](sequence-02.md)
- [Customer Melacak Service Order](sequence-03.md)
- [Customer Berkonsultasi dengan AI Miko](sequence-04.md)
- [Admin Berkonsultasi dengan AI Miko](sequence-05.md)
- [Admin Mengelola Inventaris](sequence-06.md)
- [Pengguna Mengelola Notifikasi](sequence-07.md)
- [Sistem Mengirim Notifikasi WhatsApp](sequence-08.md)
- [Pengguna Melakukan Autentikasi](sequence-09.md)
- [Customer Mengelola Preferensi WhatsApp](sequence-10.md)

## Catatan

- `NotificationOutbox` tidak memiliki foreign key dan `InventoryItem` berdiri sendiri.
- `Notification` dan `NotificationPreference` memiliki batas unik komposit; detailnya tercantum di ERD.
- Status migrasi tabel notifikasi/WhatsApp perlu diverifikasi sebelum menganggap tabel tersedia di database runtime/produksi.
