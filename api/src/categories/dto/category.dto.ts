import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'ต้องระบุชื่อหมวดหมู่')
    .max(100, 'ชื่อหมวดหมู่ต้องยาวไม่เกิน 100 ตัวอักษร')
    .meta({
      description: 'ชื่อหมวดหมู่ ห้ามซ้ำภายในเจ้าของร้านคนเดียวกัน',
      example: 'เครื่องดื่ม',
    }),
  displayOrder: z
    .number()
    .int('ลำดับการแสดงผลต้องเป็นจำนวนเต็ม')
    .min(0, 'ลำดับการแสดงผลต้องไม่ติดลบ')
    .optional()
    .meta({ description: 'ลำดับการแสดงผล ยิ่งน้อยยิ่งอยู่บน', example: 0 }),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}

export const updateCategorySchema = createCategorySchema.partial();

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  ownerId: z.uuid(),
  name: z.string(),
  displayOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export class CategoryResponseDto extends createZodDto(categoryResponseSchema) {}
