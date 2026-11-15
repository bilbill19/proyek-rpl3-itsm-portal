# 2. Admin Memproses Service Order

Status: final, berdasarkan audit source di `C:\laragon1\www\projek_rpl`.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant UI as Detail Order Admin
    participant API as PATCH /api/orders/[id]
    participant Auth as getSession
    participant DB as PostgreSQL via Prisma
    participant WA as Dispatcher WhatsApp

    A->>UI: Ubah status, catatan, atau harga
    UI->>API: Kirim perubahan order
    API->>Auth: Validasi sesi dan role ADMIN
    Auth->>DB: Muat dan validasi User aktif
    DB-->>Auth: Data user atau tidak ditemukan
    Auth-->>API: Sesi dan role

    alt Bukan admin atau sesi tidak valid
        API-->>UI: 403 Akses ditolak
    else Admin
        API->>DB: Cari ServiceOrder berdasarkan id
        DB-->>API: Order lama / tidak ditemukan
        alt Order tidak ditemukan
            API-->>UI: 404 Pesanan tidak ditemukan
        else Order ditemukan
            API->>DB: Mulai transaksi
            API->>DB: Update status dan/atau harga yang dikirim
            opt Status berubah atau catatan tidak kosong
                API->>DB: Buat ServiceOrderStatusHistory
            end
            opt Status benar-benar berubah
                API->>DB: Upsert Notification dengan dedupKey status
                API->>DB: Buat NotificationOutbox order_status_whatsapp
            end
            DB-->>API: Commit transaksi atau rollback saat error

            opt Perubahan berhasil
                alt WhatsApp live aktif
                    API->>WA: kickWhatsappOutbox() non-blocking
                else Simulation atau disabled
                    API->>WA: processOutbox()
                end
                WA->>DB: Proses outbox dan, bila sesuai, tulis WhatsAppDelivery
                API->>DB: Muat ulang order beserta service dan riwayat
                DB-->>API: Data terbaru
                API-->>UI: 200 order terbaru
            end
        end
    end
```
