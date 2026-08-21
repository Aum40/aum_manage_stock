import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const paginationSchema = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
};
