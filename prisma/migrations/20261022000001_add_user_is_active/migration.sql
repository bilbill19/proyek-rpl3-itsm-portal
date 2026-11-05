-- Status akun pada tabel users (migrasi additive, disetujui pemilik proyek):
-- false = login ditolak & sesi yang ada tidak berlaku (diperiksa login route + getSession).
-- DEFAULT true → seluruh akun yang sudah ada TETAP aktif (tanpa reset/ubah data lama).
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");
