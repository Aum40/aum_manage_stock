import { z } from 'zod';

export const adjustStockSchema = z.object({
  shopProductId: z.string().uuid(),
  operation: z.enum(['INCREASE', 'DECREASE']),
  quantity: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

export type AdjustStockDto = z.infer<typeof adjustStockSchema>;
