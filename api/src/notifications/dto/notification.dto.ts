import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'LOW_STOCK',
  'SUBSCRIPTION_EXPIRING',
  'SUBSCRIPTION_EXPIRED',
  'ACCOUNT_SUSPENDED',
  'PRODUCT_LIMIT_REACHED',
  'SHOP_LIMIT_REACHED',
] as const;

export const ListNotificationQuerySchema = z.object({
  unreadOnly: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  shopId: z.uuid('shopId ต้องเป็น UUID').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListNotificationQueryDto = z.infer<
  typeof ListNotificationQuerySchema
>;
