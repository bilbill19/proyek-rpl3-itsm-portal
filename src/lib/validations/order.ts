import { z } from 'zod';

export const createServiceOrderSchema = z
  .object({
    serviceId: z.string().optional().or(z.literal('')),
    deviceType: z.string().min(2, 'Jenis perangkat wajib dipilih / diisi (cth: Laptop, PC Desktop, MacBook)'),
    deviceBrand: z.string().min(2, 'Merk & tipe perangkat wajib diisi (cth: Asus ROG Zephyrus G14)'),
    problemDescription: z
      .string()
      .min(10, 'Deskripsi kerusakan minimal 10 karakter agar teknisi dapat menganalisa dengan tepat'),
    damageImage: z.string().optional().or(z.literal('')),
    serviceMethod: z.enum(['DROP_OFF', 'ONSITE'], {
      required_error: 'Pilih metode layanan (Antar perangkat atau Teknisi ke lokasi)',
    }),
    address: z.string().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.serviceMethod === 'ONSITE') {
        return !!data.address && data.address.trim().length >= 5;
      }
      return true;
    },
    {
      message: 'Alamat lengkap wajib diisi jika memilih layanan Teknisi Datang ke Lokasi (Home Service)',
      path: ['address'],
    }
  );

export type CreateServiceOrderInput = z.infer<typeof createServiceOrderSchema>;
