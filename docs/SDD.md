# SDD - Arsitektur dan perancangan ITSM Portal

## 1. Arsitektur aktual

Browser React -> Next.js App Router (Server Components + Route Handlers) -> Prisma Client -> PostgreSQL. Cookie JWT ditandatangani jose HS256; lib/auth.getSession mengambil ulang akun dari DB. Layout memanggil requireAdmin/requireCustomer. API tetap wajib memeriksa sesi/peran/kepemilikan. Middleware membantu navigasi dan tidak menjadi satu-satunya batas akses.

Modul: auth/rbac; services/orders/customers/inventory; AI pipeline dan provider; notification service; WhatsApp transactional outbox. Tidak ada microservice independen dalam ZIP. File Dockerfile dan workflow baru adalah rancangan delivery yang belum dijalankan.

## 2. Empat UML dan pemetaan kode

Diagram Use Case memetakan tujuan aktor. Activity memetakan pesan konsultasi dari sesi hingga respons/fallback. Class menunjukkan kelas provider yang benar-benar ada serta modul TypeScript dengan stereotype module; tidak mengarang seluruh aplikasi sebagai kelas OOP. Sequence menunjukkan alur pesan pertama Miko (frontend, backend, DB, AI API) beserta cabang penolakan dan fallback.

Sumber diagram dapat diedit pada docs/diagrams/*.puml dan SVG. Diagram yang tercetak di laporan menggunakan representasi vektor setara; diagram menyederhanakan atribut/metode tanpa mengubah batas otorisasi.

## 3. Skenario use case

UC01 Registrasi: tamu mengisi profil -> validasi -> cek email -> hash bcrypt -> user CUSTOMER -> cookie sesi. Alternatif: format salah 400, duplikat 409. Akhir: akun tersimpan. Ketergantungan: DB/JWT.

UC02 Buat pesanan: pelanggan login, pilih metode dan layanan -> validasi -> cek layanan aktif -> alokasi tiket -> nested create order/history. Alternatif: alamat onsite kurang 400; admin 403; benturan tiket retry terbatas. Akhir: tiket CREATED.

UC03 Update pesanan: admin login, pilih order -> input status/catatan/biaya -> validasi -> transaksi order/history/notifikasi/outbox -> proses outbox di luar transaksi -> respons aman. Alternatif: order tidak ada 404, input salah 400, akses 403. Race update paralel masih perlu uji DB.

UC04 Konsultasi Miko: pemilik sesi membuat/membuka percakapan -> validasi dan cek kepemilikan -> simpan pesan -> scope dan routing peran -> konteks DB terfilter -> provider atau jawaban deterministik -> simpan balasan. Alternatif: pemilik berbeda 403, limiter 429, NVIDIA gagal -> fallback berlabel.

UC05 Tracking: tamu memasukkan tiket -> pembatas -> lookup -> status ringkas tanpa catatan privat. Nomor tiket masih berurutan, sehingga informasi perangkat/status tidak boleh dianggap sepenuhnya rahasia. Untuk privasi lebih ketat, rancang token tracking acak atau autentikasi tambahan.

UC06 Notifikasi: perubahan status membuat in-app/outbox dalam transaksi. Dispatcher mengklaim event, memeriksa opt-in dan mode, lalu simulation/live. Crash setelah pengiriman sebelum commit status dapat menyebabkan duplikasi; tidak ada jaminan exactly-once.

## 4. SOLID dan keputusan desain

SRP: validasi harga/order dipusatkan dalam validations/order; retry tiket hanya menangani benturan unik. OCP/DIP: AIProviderInterface memisahkan kontrak generateResponse dari NVIDIA/ExpertEngine/provider lain. LSP/ISP: provider menerima ChatMessage dan mengembalikan AIResponseResult, bukan menulis DB. Komposisi pipeline masih banyak tanggung jawab; pemisahan scope, konteks, dan adapter adalah arah refaktor, bukan klaim bahwa seluruh kode telah sempurna SOLID.

Transaksi order/history/notifikasi/outbox menghindari notifikasi dari transaksi yang rollback. HTTP WhatsApp ditempatkan di luar transaksi agar gangguan jaringan tidak menahan lock DB. Pengiriman ulang tetap memerlukan desain idempotensi provider dan observabilitas.

## 5. ERD dan kamus data

ERD mengikuti 11 model Prisma aktual. Relasi penting: User 1:N ServiceOrder dan AIConversation; Service 0..1:N ServiceOrder; order 1:N history/notification/delivery; conversation 1:N message. InventoryItem berdiri sendiri. NotificationOutbox menyimpan payload JSON sebagai Text, tanpa foreign key ke order/user. Jangan menggambar relasi FK yang tidak ada.

Kunci unik: User.email, ServiceOrder.ticketNumber, InventoryItem.sku, Notification(orderId,dedupKey), NotificationPreference(userId,channel). Notification dengan orderId null dapat memiliki dedupKey sama menurut semantik NULL PostgreSQL. Uang memakai Decimal(12,2), bukan float penyimpanan. Enum status mempunyai 8 nilai; kode saat ini tidak menerapkan state machine transisi maju saja.

### User

id            String           @id @default(uuid()); name          String; email         String           @unique; password      String; phone         String?; role          Role             @default(CUSTOMER); isActive      Boolean          @default(true); createdAt     DateTime         @default(now()); updatedAt     DateTime         @updatedAt; orders        ServiceOrder[]; conversations AIConversation[]; notifications Notification[]; notificationPrefs  NotificationPreference[]; whatsappDeliveries WhatsAppDelivery[]

### Service

id                String         @id @default(uuid()); name              String; description       String         @db.Text; price             Decimal        @db.Decimal(12, 2); estimatedDuration String; image             String?; isActive          Boolean        @default(true); createdAt         DateTime       @default(now()); updatedAt         DateTime       @updatedAt; orders            ServiceOrder[]

### ServiceOrder

id                 String                      @id @default(uuid()); ticketNumber       String                      @unique; customerId         String; serviceId          String?; deviceType         String; deviceBrand        String; problemDescription String                      @db.Text; damageImage        String?                     @db.Text; serviceMethod      String                      @default("DROP_OFF"); address            String?                     @db.Text; estimatedPrice     Decimal?                    @db.Decimal(12, 2); finalPrice         Decimal?                    @db.Decimal(12, 2); status             OrderStatus                 @default(CREATED); createdAt          DateTime                    @default(now()); updatedAt          DateTime                    @updatedAt; customer           User                        @relation(fields: [customerId], references: [id], onDelete: Cascade); service            Service?                    @relation(fields: [serviceId], references: [id], onDelete: SetNull); statusHistory      ServiceOrderStatusHistory[]; notifications      Notification[]; whatsappDeliveries WhatsAppDelivery[]

### ServiceOrderStatusHistory

id        String       @id @default(uuid()); orderId   String; status    OrderStatus; note      String?      @db.Text; createdAt DateTime     @default(now()); order     ServiceOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)

### AIConversation

id         String       @id @default(uuid()); customerId String; title      String       @default("Konsultasi Perbaikan IT"); createdAt  DateTime     @default(now()); updatedAt  DateTime     @updatedAt; customer   User         @relation(fields: [customerId], references: [id], onDelete: Cascade); messages   AIMessage[]

### AIMessage

id             String         @id @default(uuid()); conversationId String; role           MessageRole    @default(USER); content        String         @db.Text; createdAt      DateTime       @default(now()); conversation   AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

### InventoryItem

id            String    @id @default(uuid()); sku           String    @unique; name          String; category      String; brand         String?; compatibility String?; stock         Int       @default(0); minStock      Int       @default(5); unit          String    @default("Unit"); purchasePrice Decimal   @db.Decimal(12, 2); sellingPrice  Decimal   @db.Decimal(12, 2); location      String?; condition     String    @default("NEW"); notes         String?   @db.Text; isActive      Boolean   @default(true); createdAt     DateTime  @default(now()); updatedAt     DateTime  @updatedAt

### Notification

id        String    @id @default(uuid()); userId    String; orderId   String?; type      String    @default("order_status"); title     String; body      String    @db.Text; dedupKey  String?; isRead    Boolean   @default(false); createdAt DateTime  @default(now()); user  User          @relation(fields: [userId], references: [id], onDelete: Cascade); order ServiceOrder? @relation(fields: [orderId], references: [id], onDelete: SetNull)

### NotificationPreference

id        String   @id @default(uuid()); userId    String; channel   String; enabled   Boolean  @default(false); updatedAt DateTime @updatedAt; user User @relation(fields: [userId], references: [id], onDelete: Cascade)

### WhatsAppDelivery

id                String    @id @default(uuid()); orderId           String?; userId            String; toPhone           String; templateName      String    @default("itsm_order_status_update"); mode              String; status            String; providerMessageId String?; error             String?   @db.Text; attempts          Int       @default(0); createdAt         DateTime  @default(now()); updatedAt         DateTime  @updatedAt; order ServiceOrder? @relation(fields: [orderId], references: [id], onDelete: SetNull); user  User          @relation(fields: [userId], references: [id], onDelete: Cascade)

### NotificationOutbox

id            String    @id @default(uuid()); eventType     String; payload       String    @db.Text; status        String    @default("pending"); attempts      Int       @default(0); nextAttemptAt DateTime  @default(now()); lastError     String?   @db.Text; createdAt     DateTime  @default(now()); updatedAt     DateTime  @updatedAt

## 6. UI/UX dan alur interaksi

Personas: pelanggan membutuhkan kepastian status dan langkah lanjut; admin membutuhkan antrean, stok dan kontrol peran. Arsitektur informasi mengikuti portal tamu -> login -> dashboard pelanggan atau admin. Alur prioritas: lihat layanan -> buat pesanan -> detail tiket -> konsultasi -> update admin -> notifikasi.

Prototipe lokal: docs/uiux/prototype.html. Semua data contoh disimpan hanya dalam memori browser; konsultasi diberi label simulasi. Interaksi: pilih peran, navigasi, isi form onsite, buat tiket, ubah status admin, lihat detail dan chat contoh. Bukan aplikasi produksi dan bukan artefak Figma yang sudah dipublikasi.

Token rancangan: latar #F3F6FB, teks #172033, primer #4338CA, status berhasil #166534, bahaya #B91C1C. Tipografi system sans; spasi 8/16/24/32 px; target tombol 44 px; fokus outline; label eksplisit; status dengan teks; breakpoint 720 px. Kondisi UI harus mencakup loading, empty, error, success dan disabled.

Figma handoff: buat frame Desktop 1440 dan Mobile 375 untuk Login, Dashboard, Buat Pesanan, Detail Pesanan, Konsultasi, Admin Orders; buat komponen Button/Input/Badge/Card; hubungkan klik sesuai prototype; tambahkan error ONSITE tanpa alamat; aktifkan share view untuk dosen. Catat URL Figma nyata pada README setelah tersedia.

Validasi UX yang belum dilakukan: walkthrough dengan minimal 3 pengguna, waktu menyelesaikan pesanan, jumlah error, akses keyboard, kontras dan pembaca layar. Screenshot bukti_polish_ui dalam ZIP berasal dari pekerjaan sebelumnya dan tidak dipakai sebagai bukti pemeriksaan sesi ini.

## 7. API, data sensitif, dan kegagalan

401 untuk sesi tidak ada pada jalur detail; 403 untuk hak akses tidak cukup; 400 untuk input salah; 404 objek tidak ada; 429 pembatas; 500 galat internal umum pada jalur pesanan/tracking yang diperbaiki. Beberapa endpoint lama masih menggunakan error.message dan perlu sanitasi lanjutan. Jangan mengekspor raw log produksi atau env.

Password recovery email belum tersedia: endpoint sekarang 503, bukan sukses palsu. Provider email, verifikasi domain dan pengujian tautan diperlukan untuk mengaktifkannya. Endpoint reset-token tetap ada tetapi tidak ada jalur pengiriman token otomatis yang diklaim berhasil.

## 8. Strategi deployment dan rollback

Sebelum publikasi: migrasikan Next.js dari 14.2.35 ke versi terpelihara, sesuaikan API async cookies/params bila diperlukan, perbarui lockfile, jalankan unit/typecheck/migrate/build/security audit dan E2E. Percobaan akses registry sesi ini gagal; versi paket tidak diubah tanpa uji.

CI pada push/PR: npm ci -> prisma generate/validate -> migrate deploy pada Postgres bersih -> typecheck -> tests -> build -> dependency audit. CD manual hanya setelah verify lulus: build/push image GHCR dengan tag SHA, environment production. Ini continuous delivery artefak; aktivasi server live tetap pekerjaan eksternal.

Migrasi dijalankan satu kali oleh operator memakai source dengan Prisma CLI sebelum container aplikasi baru. Container runner hanya memuat standalone server dan static; bukan image migrasi. Backup dulu, lakukan smoke test, dan rollback image ke tag SHA sebelumnya bila gagal. Migrasi rollback database memerlukan prosedur restore yang diuji, bukan menjalankan seed.

Runtime env minimal DATABASE_URL, JWT_SECRET random, NEXT_PUBLIC_APP_URL HTTPS; key NVIDIA bila demo live; WhatsApp nonaktif sampai opt-in dan provider dikonfigurasi. Gunakan TLS reverse proxy dan jaringan DB privat. Jangan mengirim env sebagai build arg atau memasukkan secret dalam image.
