import { z } from 'zod';

/**
 * ปลายทางระบุแค่ `toShopId` ไม่ต้องส่ง shopProductId ของร้านปลายทางมา
 *
 * ให้ api หาแถวปลายทางเองจาก productId ของต้นทาง — ตัดความเป็นไปได้ที่ผู้เรียก
 * จะส่งคู่ที่ไม่ใช่สินค้าเดียวกันมา ซึ่งจะกลายเป็นการย้ายของข้ามสินค้าโดยไม่มี
 * ใครรู้ตัว
 */
export const transferStockSchema = z.object({
  shopProductId: z.string().uuid(),
  toShopId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

export type TransferStockDto = z.infer<typeof transferStockSchema>;
