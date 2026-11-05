import { z } from 'zod';

export const serviceSchema = z.object({
  name: z.string().min(3, 'Nama layanan minimal 3 karakter'),
  description: z.string().min(10, 'Deskripsi layanan minimal 10 karakter'),
  price: z.coerce.number().min(0, 'Tarif layanan tidak boleh negatif'),
  estimatedDuration: z.string().min(2, 'Estimasi durasi minimal 2 karakter (cth: 2 - 4 Jam)'),
  image: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
