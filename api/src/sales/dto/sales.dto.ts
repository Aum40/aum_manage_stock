import { z } from 'zod';
import { paginationSchema } from '../../common/validation/schemas';

export const scanSaleSchema = z.object({
  barcode: z.string().trim().min(1).max(128),
});
export type ScanSaleDto = z.infer<typeof scanSaleSchema>;

export const createSaleSchema = z.object({
  items: z
    .array(
      z.object({
        shopProductId: z.string().uuid(),
        quantity: z.coerce.number().int().positive().max(100000),
      }),
    )
    .min(1)
    .max(100),
  note: z.string().trim().max(500).optional(),
});
export type CreateSaleDto = z.infer<typeof createSaleSchema>;

export const saleQuerySchema = z.object(paginationSchema);
export type SaleQueryDto = z.infer<typeof saleQuerySchema>;

export const voidSaleSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
export type VoidSaleDto = z.infer<typeof voidSaleSchema>;
