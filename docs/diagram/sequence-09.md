# 9. Pengguna Melakukan Autentikasi

Status: final, berdasarkan audit source di `C:\laragon1\www\projek_rpl`.

```mermaid
sequenceDiagram
    autonumber
    actor U as Pengguna
    participant UI as Form Auth
    participant API as /api/auth/*
    participant Auth as Utilitas auth dan cookie
    participant DB as PostgreSQL via Prisma

    alt Registrasi
        U->>UI: Isi nama, email, password, telepon opsional
        UI->>API: POST /api/auth/register
        API->>API: Validasi registerSchema
        API->>DB: Cari email
        alt Email sudah dipakai
            API-->>UI: 409 Email terdaftar
        else Email tersedia
            API->>Auth: Hash password
            API->>DB: Buat User role CUSTOMER
            API->>Auth: Buat JWT dan set cookie httpOnly
            API-->>UI: 201 User dan redirect /dashboard
        end
    else Login
        U->>UI: Kirim email dan password
        UI->>API: POST /api/auth/login
        API->>DB: Cari User berdasarkan email
        API->>Auth: Bandingkan password dengan hash
        alt Kredensial salah
            API-->>UI: 401 Pesan umum kredensial salah
        else Akun nonaktif
            API-->>UI: 403 Akun dinonaktifkan
        else Valid
            API->>Auth: Buat JWT 7 hari dan cookie sesi
            API-->>UI: Redirect ADMIN ke /admin/dashboard atau CUSTOMER ke /dashboard
        end
    else Lupa password
        U->>UI: Kirim email
        UI->>API: POST /api/auth/forgot-password
        API->>DB: Cari User
        alt Email tidak terdaftar
            API-->>UI: Respons sukses umum yang sama
        else Email terdaftar
            API->>Auth: Buat token reset 15 menit terkait hash password
            Note over API: Provider email belum terintegrasi;<br/>token/link tidak dikirim dan tidak dikembalikan ke UI.
            API-->>UI: Respons sukses umum yang sama
        end
    else Reset password
        U->>UI: Kirim email, token, password baru
        UI->>API: POST /api/auth/reset-password
        API->>DB: Cari User
        API->>Auth: Verifikasi token, email, userId, kedaluwarsa
        alt Token atau user tidak valid
            API-->>UI: 400 Tautan tidak valid/kedaluwarsa
        else Token valid
            API->>Auth: Hash password baru
            API->>DB: Update User.password
            API-->>UI: 200 Password diperbarui
        end
    else Logout
        U->>UI: Pilih logout
        UI->>API: POST /api/auth/logout
        API->>Auth: Hapus cookie itsm_session_token
        API-->>UI: 200 Berhasil logout
    end
    Note over Auth,DB: Tidak ada tabel sesi atau token reset di ERD.<br/>JWT sesi disimpan di cookie; getSession memvalidasi JWT lalu memuat ulang User aktif dari database.
```
