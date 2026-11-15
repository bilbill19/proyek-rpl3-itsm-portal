# 8. Sistem Mengirim Notifikasi WhatsApp

Status: final, berdasarkan audit source di `C:\laragon1\www\projek_rpl`.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant OrderAPI as PATCH /api/orders/[id]
    participant DB as PostgreSQL via Prisma
    participant D as WhatsApp Dispatcher
    participant P as Provider Meta atau Fonnte
    participant Pref as NotificationPreference dan User

    A->>OrderAPI: Ubah status order
    OrderAPI->>DB: Transaksi update order + history
    opt Status berubah
        OrderAPI->>DB: Upsert Notification
        OrderAPI->>DB: Buat NotificationOutbox order_status_whatsapp
    end
    DB-->>OrderAPI: Commit
    alt Mode live aktif
        OrderAPI->>D: kickWhatsappOutbox non-blocking
    else Simulation atau disabled
        OrderAPI->>D: processOutbox
    end
    D->>DB: Ambil outbox jatuh tempo lalu klaim atomik
    DB-->>D: Baris yang berhasil diklaim
    D->>D: Validasi event dan payload
    D->>DB: Pastikan User ada dan cek order opsional
    alt Payload tidak valid atau akun hilang
        D->>DB: Tandai outbox failed
    else Simulation / pengiriman nonaktif
        D->>DB: Buat WhatsAppDelivery status simulated
        D->>DB: Tandai outbox done
    else Live
        D->>Pref: Baca opt-in channel whatsapp dan nomor tersimpan
        alt Tidak opt-in
            D->>DB: Tandai outbox done tanpa delivery
        else Opt-in tetapi nomor tidak valid
            D->>DB: Catat delivery failed dan outbox failed
        else Opt-in dan nomor valid
            D->>D: Periksa konfigurasi live dan template
            alt Kredensial/template belum siap
                D->>DB: Tandai outbox failed
            else Siap
                D->>P: Kirim template Meta atau teks Fonnte
                alt Provider menerima request
                    P-->>D: messageId
                    D->>DB: Buat WhatsAppDelivery sent dan outbox done
                else Error jaringan yang dapat dicoba ulang
                    P-->>D: Error retryable
                    D->>DB: Catat failed delivery dan jadwalkan retry terbatas
                else Gagal permanen / retry habis
                    P-->>D: Error
                    D->>DB: Buat delivery failed dan outbox failed
                end
            end
        end
    end
    Note over D,DB: GET /api/notifications juga memicu dispatcher secara throttled.<br/>Webhook POST /api/whatsapp/webhook hanya mengakui payload; status provider tidak disimpan.
    Note over D,P: Status sent berarti provider menerima request, bukan konfirmasi pesan sampai ke perangkat.
```
