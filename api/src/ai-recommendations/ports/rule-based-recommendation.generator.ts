import { Injectable } from '@nestjs/common';
import type { GeneratedRecommendation } from '../dto/ai-recommendation.dto';
import type {
  RecommendationGenerator,
  ShopMetric,
} from './recommendation-generator.port';

const STALE_DAYS = 30;

/**
 * คำแนะนำจากกฎล้วน ไม่เรียก LLM
 *
 * ใช้เป็น fallback เมื่อ LLM ล่ม/โควตาหมด/ยังไม่ได้ตั้งค่า — Ollama free tier
 * ล้มแบบสุ่มจริง (เจอตอนทำ chatbot) การมีตัวนี้ทำให้แดชบอร์ดไม่เคยว่างเปล่า
 */
@Injectable()
export class RuleBasedRecommendationGenerator implements RecommendationGenerator {
  generate(metrics: ShopMetric[]): Promise<GeneratedRecommendation[]> {
    const results: GeneratedRecommendation[] = [];

    for (const metric of metrics) {
      const recommendation = this.evaluate(metric);
      if (recommendation) results.push(recommendation);
    }

    return Promise.resolve(results);
  }

  private evaluate(metric: ShopMetric): GeneratedRecommendation | null {
    if (metric.stockQty <= metric.lowStockThreshold) {
      const suggested = Math.max(metric.soldLast30Days, 10);

      return {
        type: 'RESTOCK',
        productName: metric.productName,
        title: `เติมสต็อก ${metric.productName}`,
        content:
          `เหลือ ${metric.stockQty} ${metric.unit} ต่ำกว่าจุดแจ้งเตือน (${metric.lowStockThreshold}) ` +
          `ขายได้ ${metric.soldLast30Days} ${metric.unit} ใน 30 วันที่ผ่านมา ` +
          `แนะนำสั่งเพิ่มประมาณ ${suggested} ${metric.unit}`,
      };
    }

    const neverSold = metric.daysSinceLastSale === null;
    const stale = neverSold || (metric.daysSinceLastSale ?? 0) >= STALE_DAYS;

    if (stale && metric.stockQty > 0) {
      return {
        type: 'CLEARANCE',
        productName: metric.productName,
        title: `ระบายสต็อก ${metric.productName}`,
        content: neverSold
          ? `ยังไม่เคยขายได้เลย แต่มีสต็อกค้างอยู่ ${metric.stockQty} ${metric.unit} ลองจัดโปรโมชันหรือลดราคาเพื่อระบายสต็อก`
          : `ไม่มีการขายมา ${metric.daysSinceLastSale} วัน เหลือสต็อก ${metric.stockQty} ${metric.unit} ควรพิจารณาลดราคาเพื่อระบายสต็อก`,
      };
    }

    return null;
  }
}
