import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CategoryResponseDto extends createZodDto(categoryResponseSchema) {}
