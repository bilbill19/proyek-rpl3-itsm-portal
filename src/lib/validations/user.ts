import { z } from 'zod';

/**
 * Skema validasi Manajemen User (Admin only).
 * KEAMANAN:
 *   - Kata sandi HANYA diterima untuk di-hash (bcrypt via lib/auth) — tidak
 *     pernah dikirim kembali dalam bentuk apa pun ke UI/API.
 *   - Email dinormalisasi huruf kecil; unik diverifikasi di route handler.
 */
export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120, 'Nama terlalu panjang'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Format email tidak valid')
    .max(190, 'Email terlalu panjang'),
  password: z
    .string()
    .min(8, 'Kata sandi minimal 8 karakter')
    .max(100, 'Kata sandi terlalu panjang'),
  role: z.enum(['ADMIN', 'CUSTOMER'], {
    errorMap: () => ({ message: 'Role harus ADMIN atau CUSTOMER' }),
  }),
  phone: z.string().trim().max(30, 'Nomor telepon terlalu panjang').optional().nullable(),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(120).optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Format email tidak valid')
      .max(190)
      .optional(),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .max(100)
      .optional(),
    role: z.enum(['ADMIN', 'CUSTOMER']).optional(),
    isActive: z.boolean().optional(),
    phone: z.string().trim().max(30).optional().nullable(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.email !== undefined ||
      data.password !== undefined ||
      data.role !== undefined ||
      data.isActive !== undefined ||
      data.phone !== undefined,
    { message: 'Tidak ada perubahan yang dikirim' }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
