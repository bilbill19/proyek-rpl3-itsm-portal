import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    email: z.string().email('Format email tidak valid'),
    phone: z.string().min(8, 'Nomor telepon minimal 8 digit').optional().or(z.literal('')),
    password: z
      .string()
      .min(6, 'Password minimal 6 karakter')
      .max(100, 'Password maksimal 100 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10, 'Token reset password tidak valid atau telah kedaluwarsa'),
    email: z.string().email('Email tidak valid'),
    password: z.string().min(6, 'Password baru minimal 6 karakter'),
    confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi kata sandi baru tidak cocok',
    path: ['confirmPassword'],
  });

export const createOrderSchema = z.object({
  serviceId: z.string().optional(),
  deviceType: z.string().min(2, 'Jenis perangkat wajib diisi (cth: Laptop, PC, MacBook)'),
  deviceBrand: z.string().min(2, 'Merk & tipe perangkat wajib diisi (cth: Asus ROG G14)'),
  problemDescription: z.string().min(10, 'Deskripsi kerusakan minimal 10 karakter'),
  address: z.string().optional(),
});
