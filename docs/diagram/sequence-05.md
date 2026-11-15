# 5. Admin Berkonsultasi dengan AI Miko

Status: final, berdasarkan audit source di `C:\laragon1\www\projek_rpl`.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant UI as Halaman Admin AI
    participant API as /api/ai/conversations dan /messages
    participant Auth as getSession
    participant DB as PostgreSQL via Prisma
    participant Pipe as generateRoleReply
    participant Provider as NVIDIA NIM

    A->>UI: Buka konsultasi operasional
    UI->>API: GET /api/ai/conversations
    API->>Auth: Verifikasi sesi
    Auth->>DB: Validasi user aktif
    DB-->>Auth: Sesi valid / null
    Auth-->>API: Hasil autentikasi
    alt Belum login
        API-->>UI: 401 Harap login
    else Login
        API->>DB: Cari AIConversation dengan customerId = id sesi admin
        DB-->>API: Riwayat milik admin
        API-->>UI: Daftar percakapan admin sendiri
        A->>UI: Kirim pertanyaan operasional
        UI->>API: POST /api/ai/conversations atau /[id]/messages
        API->>DB: Periksa kepemilikan conversation
        alt Bukan pemilik atau conversation tidak ada
            API-->>UI: 403 atau 404
        else Valid
            API->>DB: Simpan AIMessage USER
            API->>Pipe: Kirim pesan, riwayat, sesi ADMIN
            Pipe->>Pipe: Scope dan identitas; tentukan konteks operasional
            Pipe->>DB: Baca agregat pelanggan, order, inventaris, finansial
            DB-->>Pipe: Data operasional read-only
            alt Tool data menjawab langsung
                Pipe-->>API: Jawaban deterministik dari database
            else Perlu jawaban generatif
                Pipe->>Provider: Kirim konteks sistem dan riwayat
                alt NVIDIA tersedia
                    Provider-->>Pipe: Jawaban NIM
                else NIM gagal
                    Pipe-->>API: Ringkasan konteks database deterministik
                end
            end
            API->>DB: Simpan AIMessage ASSISTANT dan perbarui judul/waktu
            API-->>UI: Balasan dan metadata provider
        end
    end
```
