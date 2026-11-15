# 1. Customer Membuat Service Order

Status: final, berdasarkan audit source di `C:\laragon1\www\projek_rpl`.

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    participant UI as Form Order
    participant API as POST /api/orders
    participant Auth as getSession
    participant DB as PostgreSQL via Prisma

    C->>UI: Isi detail perangkat dan layanan
    UI->>API: Kirim form order
    API->>Auth: Verifikasi cookie sesi
    Auth->>DB: Muat dan validasi User aktif
    DB-->>Auth: Data user atau tidak ditemukan
    Auth-->>API: Sesi valid / null

    alt Tidak login atau sesi tidak valid
        API-->>UI: 401 Harap login
    else Sesi valid
        API->>API: Validasi createServiceOrderSchema
        alt Data tidak valid
            API-->>UI: 400 Error validasi
        else Data valid
            opt serviceId diisi
                API->>DB: Cari Service berdasarkan id
                DB-->>API: Service / tidak ditemukan
            end
            Note over API,DB: Nomor SRV-YYYY-XXXX dihitung dari jumlah order tahun berjalan;<br/>nomor yang sudah dipakai dilewati dengan pemeriksaan ticketNumber.
            API->>DB: Buat ServiceOrder status CREATED
            API->>DB: Buat ServiceOrderStatusHistory awal dalam nested create
            DB-->>API: Order, service, dan riwayat
            API-->>UI: 201 order + redirectUrl
            UI-->>C: Tampilkan hasil dan arahkan ke detail order
        end
    end
```
