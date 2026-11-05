# Panduan Setup WhatsApp Cloud API (Meta) — ITSM Portal

Panduan resmi **10 langkah** menghubungkan notifikasi WhatsApp **mode LIVE**.
Mode **SIMULATION berjalan tanpa langkah ini** (tanpa token, preview + label
`SIMULASI` saja). Jangan aktifkan LIVE sebelum seluruh prasyarat terpenuhi.

> ⚠️ Kredensial bersifat **server-side only**. Simpan di `.env.local`
> (tidak pernah masuk `NEXT_PUBLIC_*`, log, repo, atau respons API).

---

## Daftar Environment Variables (server-side)

| Variabel | Contoh / Nilai awal | Keterangan |
|---|---|---|
| `WHATSAPP_ENABLED` | `false` | Saklar utama. `false` = tak ada kiriman apa pun. |
| `WHATSAPP_MODE` | `simulation` | `simulation` \| `live`. Default aman: `simulation`. |
| `WHATSAPP_PROVIDER` | `meta` | Adapter provider (khusus Meta Cloud API). |
| `WHATSAPP_ACCESS_TOKEN` | *(rahasia)* | System-user token (never expose). |
| `WHATSAPP_PHONE_NUMBER_ID` | `1234567890` | ID nomor bisnis Meta. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `WABA_ID` | ID WhatsApp Business Account. |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | *(rahasia)* | Token verifikasi webhook (acak manual). |
| `WHATSAPP_TEMPLATE_NAME` | `itsm_order_status_update` | Template APPROVED Meta. |
| `WHATSAPP_API_VERSION` | `v20.0` *(opsional)* | Versi Graph API. |

---

## 10 Langkah Konfigurasi Meta Developers

1. **Akun Developer & Business**
   Buka <https://developers.facebook.com>, login Meta, lalu siapkan akun
   **Meta Business** yang menaungi nomor bisnis (Business Manager).

2. **Buat App tipe "Business"**
   Dashboard → Create App → pilih use case **Business** → beri nama
   (cth. `itsm-notifier`) → Create App.

3. **Tambahkan produk "WhatsApp"**
   Di halaman app → Add Product → **WhatsApp** → Setup. Meta memberi
   *test number* + *temporary access token* (24 jam) untuk sandbox.

4. **Ambil kredensial permanen**
   - **Phone Number ID**: WhatsApp → API Setup → *From* number.
   - **Business Account ID**: WhatsApp → WhatsApp Business Account → Settings.
   - **Access Token permanen**: Meta Business Settings → Users → System Users →
     Add (role Admin) → Generate token → beri scope `whatsapp_business_messaging`
     & `whatsapp_business_management` → simpan sebagai `WHATSAPP_ACCESS_TOKEN`.
   Token TIDAK boleh ditaruh di frontend/repo/log.

5. **Daftarkan nomor penerima**
   Untuk LIVE, tiap nomor customer harus berada dalam audiens resmi
   (customer list / opt-in yang terekam). Portal ini menyimpan opt-in
   (`notification_preferences.channel='whatsapp'`) — **default NONAKTIF**.

6. **Buat & ajukan Message Template**
   WhatsApp → Message Templates → Create template
   (kategori **Utility**, mis. `itsm_order_status_update`):
   - Header opsional: `ITSM Portal`
   - Body: `Halo {{1}}, tiket {{2}} kini berstatus *{{3}}*. Detail: {{4}}`
   - Footer: `ITSM Portal — Service & Garansi`
   Submit → tunggu **APPROVED** sebelum LIVE. Nama persisnya dimasukkan ke
   `WHATSAPP_TEMPLATE_NAME`.

7. **Konfigurasi Webhook (opsional, untuk status delivery)**
   App → WhatsApp → Configuration → Callback URL:
   `https://<domain-anda>/api/whatsapp/webhook` + isi
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN` acak → Verify and Save
   (Meta akan GET `?hub.mode=verify&hub.verify_token=...` — endpoint membalas
   `hub.challenge` bila token cocok). Subscribe field `messages`.

8. **Aktifkan env mode bertahap**
   1. `WHATSAPP_ENABLED=false`, `WHATSAPP_MODE=simulation` → jalankan demo
      (preview + log simulasi saja, TANPA HTTP ke Meta).
   2. Isi kredensial valid + template APPROVED → uji LIVE dengan **nomor Anda
      sendiri** dulu.
   3. Baru set `WHATSAPP_ENABLED=true`, `WHATSAPP_MODE=live`.
   **Token palsu / placeholder dilarang membuat mode LIVE aktif** — validasi
   adapter menolak nilai yang mengandung `contoh|example|isi_token|changeme`.

9. **Checklist pengujian sebelum LIVE**
   - [ ] Backup DB ada (sebelum deploy perubahan apa pun).
   - [ ] Simulasi: ubah status order → muncul preview `SIMULASI` + baris
         `whatsapp_deliveries.mode='simulation'` (bukan `sent`).
   - [ ] Opt-OUT customer → kiriman LIVE dilewati (in-app tetap tampil).
   - [ ] Nomor kosong/tidak valid → status `failed` tersanitasi, pesanan TETAP
         ter-update (dispatcher di luar transaksi).
   - [ ] Retry tak menggandakan kiriman (idempotency + batas attempts).
   - [ ] Live canary ke nomor sendiri → status `sent` + `providerMessageId`.

10. **Keamanan & operasional berkelanjutan**
    - Token bocor → rotate segera di Business Settings.
    - Jangan pernah `auto-enable` LIVE dari kode/CI.
    - Pantau riwayat di **Admin → Pengaturan → Riwayat WhatsApp**
      (mode, status, jumlah attempts) — tampilan TANPA secret.
    - Hormati opt-out; jangan klaim "nomor terverifikasi" — sistem hanya
      menyimpan nomor yang diinput customer (belum ada mekanisme verifikasi).

---

## Perilaku Adapter

| Kondisi | Hasil |
|---|---|
| `WHATSAPP_MODE=simulation` | Tanpa HTTP; payload preview disimpan; label `SIMULASI`; status `simulated` (bukan `sent`). |
| `WHATSAPP_MODE=live` + kredensial valid + template + opt-in customer | POST Graph API `/{phone-number-id}/messages` (template `utility`) → status `sent` + `providerMessageId`. |
| LIVE tanpa kredensial/consent/template | Ditolak → dicatat `failed` (error tersanitasi), tanpa klaim terkirim. |
| Kegagalan pengiriman | Pesanan & notifikasi in-app TIDAK rusak (dispatcher di luar transaksi DB; retry terbatas via outbox). |

Endpoint terkait:
- `GET/PATCH /api/whatsapp/preferences` — opt-in/out + nomor tersimpan (customer).
- `GET /api/admin/whatsapp/deliveries` — riwayat (admin, read-only, tanpa secret).
- `GET /api/whatsapp/webhook` — verifikasi handshake Meta.
