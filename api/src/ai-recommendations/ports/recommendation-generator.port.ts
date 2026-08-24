import type { GeneratedRecommendation } from '../dto/ai-recommendation.dto';

export const RECOMMENDATION_GENERATOR = Symbol('RECOMMENDATION_GENERATOR');

/** ตัวเลขจริงจากฐานข้อมูลที่ใช้ตั้งต้นคำแนะนำ — เก็บลง ai_recommendations.metrics ด้วย */
export interface ShopMetric {
  shopProductId: string;
  productName: string;
  unit: string;
  stockQty: number;
  lowStockThreshold: number;
  soldLast30Days: number;
  daysSinceLastSale: number | null;
}

export interface RecommendationGenerator {
  generate(metrics: ShopMetric[]): Promise<GeneratedRecommendation[]>;
}
