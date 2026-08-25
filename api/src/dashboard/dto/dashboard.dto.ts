import { z } from 'zod';

const MAX_RANGE_DAYS = 365;
const DEFAULT_RANGE_DAYS = 30;

const dateRange = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .transform((value) => {
    const to = value.to ?? new Date();
    const from =
      value.from ??
      new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { from, to };
  })
  .refine((value) => value.from <= value.to, {
    message: 'from ต้องไม่อยู่หลัง to',
  })
  .refine(
    (value) =>
      value.to.getTime() - value.from.getTime() <=
      MAX_RANGE_DAYS * 24 * 60 * 60 * 1000,
    { message: `ช่วงเวลาต้องไม่เกิน ${MAX_RANGE_DAYS} วัน` },
  );

export const DashboardQuerySchema = dateRange;
export type DashboardQueryDto = z.infer<typeof DashboardQuerySchema>;

export const BestSellersQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .transform((value) => {
    const to = value.to ?? new Date();
    const from =
      value.from ??
      new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { from, to, limit: value.limit };
  })
  .refine((value) => value.from <= value.to, {
    message: 'from ต้องไม่อยู่หลัง to',
  });
export type BestSellersQueryDto = z.infer<typeof BestSellersQuerySchema>;

export const DeadStockQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(MAX_RANGE_DAYS).default(30),
});
export type DeadStockQueryDto = z.infer<typeof DeadStockQuerySchema>;

export const SalesTrendQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    groupBy: z.enum(['day', 'week', 'month']).default('day'),
  })
  .transform((value) => {
    const to = value.to ?? new Date();
    const from =
      value.from ??
      new Date(to.getTime() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000);
    return { from, to, groupBy: value.groupBy };
  })
  .refine((value) => value.from <= value.to, {
    message: 'from ต้องไม่อยู่หลัง to',
  })
  .refine(
    (value) =>
      value.to.getTime() - value.from.getTime() <=
      MAX_RANGE_DAYS * 24 * 60 * 60 * 1000,
    { message: `ช่วงเวลาต้องไม่เกิน ${MAX_RANGE_DAYS} วัน` },
  );
export type SalesTrendQueryDto = z.infer<typeof SalesTrendQuerySchema>;

export { DEFAULT_RANGE_DAYS, MAX_RANGE_DAYS };
