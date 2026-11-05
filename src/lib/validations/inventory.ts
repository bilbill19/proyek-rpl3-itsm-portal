import { z } from 'zod';

export const inventoryCategories = [
  'Storage (SSD/HDD)',
  'RAM / Memori',
  'Thermal Paste & Cooling',
  'Layar & LCD Panel',
  'Motherboard & IC Chips',
  'Keyboard & Trackpad',
  'Power Supply & Baterai',
  'Jaringan & Aksesoris',
] as const;

export const inventoryItemSchema = z.object({
  sku: z
    .string()
    .min(2, 'Kode SKU minimal 2 karakter')
    .max(50, 'Kode SKU maksimal 50 karakter')
    .trim(),
  name: z
    .string()
    .min(3, 'Nama komponen minimal 3 karakter')
    .max(150, 'Nama komponen maksimal 150 karakter')
    .trim(),
  category: z.string().min(2, 'Kategori wajib dipilih'),
  brand: z.string().optional().or(z.literal('')),
  compatibility: z.string().optional().or(z.literal('')),
  stock: z.coerce.number().int('Stok harus berupa bilangan bulat').min(0, 'Stok tidak boleh negatif'),
  minStock: z.coerce
    .number()
    .int('Batas stok minimal harus berupa bilangan bulat')
    .min(0, 'Batas stok tidak boleh negatif')
    .default(5),
  unit: z.string().min(1, 'Satuan wajib diisi').default('Unit'),
  purchasePrice: z.coerce.number().min(0, 'Harga beli/modal tidak boleh negatif'),
  sellingPrice: z.coerce.number().min(0, 'Harga jual/jasa tidak boleh negatif'),
  location: z.string().optional().or(z.literal('')),
  condition: z.enum(['NEW', 'REFURBISHED', 'SECOND']).default('NEW'),
  notes: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

export const stockAdjustmentSchema = z.object({
  type: z.enum(['IN', 'OUT', 'SET']),
  quantity: z.coerce.number().int('Jumlah harus bulat').min(1, 'Jumlah penyesuaian minimal 1'),
  notes: z.string().optional().or(z.literal('')),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
