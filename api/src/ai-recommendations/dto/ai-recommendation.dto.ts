import { z } from 'zod';

export const listRecommendationsQuerySchema = z.object({
  // ค่าเริ่มต้นซ่อนรายการที่ปิดไปแล้ว แต่ยังเรียกดูย้อนหลังได้
  includeDismissed: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListRecommendationsQueryDto = z.infer<
  typeof listRecommendationsQuerySchema
>;

export const generatedRecommendationSchema = z.object({
  type: z.enum(['RESTOCK', 'CLEARANCE', 'PROMOTION']),
  productName: z.string().trim().min(1),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
});

export type GeneratedRecommendation = z.infer<
  typeof generatedRecommendationSchema
>;

export const generatedRecommendationListSchema = z.object({
  recommendations: z.array(generatedRecommendationSchema),
});
