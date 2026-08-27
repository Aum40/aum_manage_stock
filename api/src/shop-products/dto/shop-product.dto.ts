import { z } from 'zod';

const money = z.coerce
  .number()
  .min(0, 'ราคาต้องไม่ติดลบ')
  .max(99_999_999.99, 'ราคาเกินขีดจำกัด')
  .refine(
    (value) => Number.isInteger(Math.round(value * 100)),
    'ราคารองรับทศนิยมไม่เกิน 2 ตำแหน่ง',
  );

export const AddShopProductSchema = z.object({
  productId: z.uuid('productId ต้องเป็น UUID'),
  sellPrice: money,
  costPrice: money,
  lowStockThreshold: z.coerce.number().int().min(0).default(0),
});
export type AddShopProductDto = z.infer<typeof AddShopProductSchema>;

export const UpdateShopProductSchema = z
  .object({
    sellPrice: money.optional(),
    costPrice: money.optional(),
    lowStockThreshold: z.coerce.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'ต้องส่งอย่างน้อย 1 ฟิลด์ที่ต้องการแก้ไข',
  });
export type UpdateShopProductDto = z.infer<typeof UpdateShopProductSchema>;

export const ListShopProductQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListShopProductQueryDto = z.infer<
  typeof ListShopProductQuerySchema
>;
