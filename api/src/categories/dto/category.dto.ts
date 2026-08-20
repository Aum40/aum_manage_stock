import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be at most 100 characters')
    .meta({
      description: 'Unique per owner, shared across every shop they own',
      example: 'Beverages',
    }),
  displayOrder: z
    .number()
    .int('Display order must be an integer')
    .min(0, 'Display order cannot be negative')
    .optional()
    .meta({
      description: 'Sort position in listings; lower values come first',
      example: 0,
    }),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CategoryResponseDto extends createZodDto(categoryResponseSchema) {}
