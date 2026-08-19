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
  displayOrder: z.number().int().min(0).optional().meta({
    description: 'Sort position in listings; lower values come first',
    example: 0,
  }),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
