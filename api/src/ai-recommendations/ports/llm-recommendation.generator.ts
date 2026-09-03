import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import type { EnvVariable } from '@/config/env.validation';
import {
  generatedRecommendationListSchema,
  type GeneratedRecommendation,
} from '../dto/ai-recommendation.dto';
import type {
  RecommendationGenerator,
  ShopMetric,
} from './recommendation-generator.port';

const SYSTEM_PROMPT = [
  'คุณเป็นผู้ช่วยวิเคราะห์สต็อกสินค้าของร้านค้าปลีกไทย',
  'อ่านตัวเลขที่ให้มาแล้วเขียนคำแนะนำเป็นภาษาไทยที่เจ้าของร้านอ่านแล้วทำตามได้ทันที',
  '',
  'ตอบเป็น JSON รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นและห้ามครอบด้วย markdown:',
  '{"recommendations":[{"type":"RESTOCK","productName":"...","title":"...","content":"..."}]}',
  '',
  'ตัวอย่าง:',
  'ข้อมูล: [{"productName":"โค้ก 325ml","unit":"กระป๋อง","stockQty":3,"lowStockThreshold":10,"soldLast30Days":48,"daysSinceLastSale":1}]',
  'ตอบ: {"recommendations":[{"type":"RESTOCK","productName":"โค้ก 325ml","title":"เติมสต็อกโค้ก 325ml ด่วน","content":"เหลือ 3 กระป๋อง ต่ำกว่าจุดแจ้งเตือน 10 แต่ขายได้ 48 กระป๋องใน 30 วัน เสี่ยงของขาด แนะนำสั่งเพิ่มอย่างน้อย 50 กระป๋อง"}]}',
  '',
  'กฎ:',
  '- type ใช้ได้แค่ RESTOCK (ควรเติมของ) / CLEARANCE (ค้างสต็อกควรระบาย) / PROMOTION (ควรจัดโปรเพิ่มยอด)',
  '- productName ต้องคัดลอกจากข้อมูลที่ให้มาตรงตัว ห้ามแต่งชื่อใหม่',
  '- content ต้องอ้างตัวเลขจริงจากข้อมูล ห้ามเดาตัวเลขเอง',
  '- แนะนำเฉพาะสินค้าที่มีประเด็นจริง ไม่ต้องแนะนำทุกตัว ถ้าไม่มีประเด็นเลยให้คืน array ว่าง',
  '- ตอบไม่เกิน 5 รายการ เรียงตามความเร่งด่วน',
].join('\n');

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['RESTOCK', 'CLEARANCE', 'PROMOTION'] },
          productName: { type: 'string' },
          title: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['type', 'productName', 'title', 'content'],
      },
    },
  },
  required: ['recommendations'],
};

@Injectable()
export class LlmRecommendationGenerator implements RecommendationGenerator {
  private client: Ollama | null = null;

  constructor(private readonly config: ConfigService<EnvVariable, true>) {}

  isEnabled(): boolean {
    return Boolean(
      this.config.get('OLLAMA_HOST', { infer: true }) &&
      this.config.get('OLLAMA_MODEL', { infer: true }),
    );
  }

  async generate(metrics: ShopMetric[]): Promise<GeneratedRecommendation[]> {
    const response = await this.getClient().chat({
      model: this.config.get('OLLAMA_MODEL', { infer: true }),
      format: RESPONSE_JSON_SCHEMA,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(this.toPromptInput(metrics)) },
      ],
    });

    const parsed = generatedRecommendationListSchema.parse(
      JSON.parse(this.extractJson(response.message.content)) as unknown,
    );

    // โมเดลอาจแต่งชื่อสินค้าที่ไม่มีจริง — ตัดทิ้งก่อนบันทึก
    const known = new Set(metrics.map((metric) => metric.productName));

    return parsed.recommendations.filter((item) => known.has(item.productName));
  }

  private toPromptInput(metrics: ShopMetric[]) {
    return metrics.map((metric) => ({
      productName: metric.productName,
      unit: metric.unit,
      stockQty: metric.stockQty,
      lowStockThreshold: metric.lowStockThreshold,
      soldLast30Days: metric.soldLast30Days,
      daysSinceLastSale: metric.daysSinceLastSale,
    }));
  }

  private getClient(): Ollama {
    if (this.client) return this.client;

    const host = this.config.get('OLLAMA_HOST', { infer: true })!;
    const apiKey = this.config.get('OLLAMA_API_KEY', { infer: true });

    this.client = new Ollama({
      host,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });

    return this.client;
  }

  // โมเดลบางตัวไม่สนใจ format แล้วครอบ JSON ด้วย markdown fence (เจอมาแล้วตอนทำ chatbot)
  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);

    return (fenced ? fenced[1] : trimmed).trim();
  }
}
