import { z } from 'zod';
import { paginationSchema } from '../../common/validation/schemas';

export const movementQuerySchema = z
  .object({
    ...paginationSchema,
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    shopProductId: z.string().uuid().optional(),
    actorId: z.string().uuid().optional(),
    movementType: z.enum(['MANUAL_ADJUSTMENT', 'CHAT_ADJUSTMENT']).optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: '`from` must be before or equal to `to`',
    path: ['from'],
  });

export const recentMovementQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(['recent', 'frequent']).default('recent'),
});

export type MovementQueryDto = z.infer<typeof movementQuerySchema>;
export type RecentMovementQueryDto = z.infer<typeof recentMovementQuerySchema>;
