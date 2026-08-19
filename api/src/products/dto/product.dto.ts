import { z } from 'zod';

const barcode = z
  .string()
  .trim()
  .min(1, 'บาร์โค้ดต้องไม่เป็นค่าว่าง')
  .max(50, 'บาร์โค้ดยาวเกิน 50 ตัวอักษร')
  .regex(/^[0-9A-Za-z\-_.]+$/, 'บาร์โค้ดมีอักขระที่ไม่อนุญาต');

export const CreateProductSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อสินค้า').max(200),
  unit: z.string().trim().min(1, 'กรุณากรอกหน่วยนับ').max(20),
  categoryId: z.uuid('categoryId ต้องเป็น UUID').nullish(),
  barcode: barcode.nullish(),
  imageUrl: z.url('imageUrl ต้องเป็น URL').max(500).nullish(),
});
export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'ต้องส่งอย่างน้อย 1 ฟิลด์ที่ต้องการแก้ไข' },
);
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;

export const ListProductQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  categoryId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListProductQueryDto = z.infer<typeof ListProductQuerySchema>;

export const SearchByBarcodeSchema = z.object({ barcode });
export type SearchByBarcodeDto = z.infer<typeof SearchByBarcodeSchema>;
