import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { z } from 'zod';
import type { EnvVariable } from '../../config/env.validation';
import { ParsedStockCommand, StockCommandParser } from './stock-command-parser';

const llmResponseSchema = z.object({
  operation: z.enum(['INCREASE', 'DECREASE']),
  productQuery: z.string().trim().min(1),
  quantity: z.number().int().positive(),
});

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    operation: { type: 'string', enum: ['INCREASE', 'DECREASE'] },
    productQuery: { type: 'string' },
    quantity: { type: 'integer' },
  },
  required: ['operation', 'productQuery', 'quantity'],
};

const SYSTEM_PROMPT = [
  'คุณเป็นตัวแปลงคำสั่งปรับสต็อกภาษาไทยเป็น JSON',
  '',
  'ตอบเป็น JSON รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นและห้ามครอบด้วย markdown:',
  '{"operation":"INCREASE","productQuery":"...","quantity":0}',
  '',
  'ตัวอย่าง:',
  'ผู้ใช้: "เพิ่มโค้ก10"',
  'ตอบ: {"operation":"INCREASE","productQuery":"โค้ก","quantity":10}',
  'ผู้ใช้: "เติมน้ำเปล่า 3 ขวด"',
  'ตอบ: {"operation":"INCREASE","productQuery":"น้ำเปล่า","quantity":3}',
  'ผู้ใช้: "ขายโค้กไป 2 กระป๋อง"',
  'ตอบ: {"operation":"DECREASE","productQuery":"โค้ก","quantity":2}',
  'ผู้ใช้: "ลดขนมปัง 5"',
  'ตอบ: {"operation":"DECREASE","productQuery":"ขนมปัง","quantity":5}',
  '',
  'กฎ:',
  '- operation = INCREASE เมื่อเพิ่ม/เติม/รับเข้า, DECREASE เมื่อลด/ตัด/ขาย/เอาออก',
  '- quantity เป็นจำนวนเต็มบวกเสมอ ห้ามติดลบ (ทิศทางอยู่ที่ operation)',
  '- productQuery คือชื่อสินค้าล้วนๆ ไม่รวมจำนวน ไม่รวมหน่วยนับ ไม่รวมคำกริยา',
].join('\n');

@Injectable()
export class LlmStockCommandParser implements StockCommandParser {
  private client: Ollama | null = null;

  constructor(private readonly config: ConfigService<EnvVariable, true>) {}

  isEnabled(): boolean {
    return Boolean(
      this.config.get('OLLAMA_HOST', { infer: true }) &&
      this.config.get('OLLAMA_MODEL', { infer: true }),
    );
  }

  async parse(message: string): Promise<ParsedStockCommand> {
    const response = await this.getClient().chat({
      model: this.config.get('OLLAMA_MODEL', { infer: true }),
      format: RESPONSE_JSON_SCHEMA,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    });

    const parsed = llmResponseSchema.parse(
      JSON.parse(this.extractJson(response.message.content)) as unknown,
    );

    return { intent: 'ADJUST_STOCK', ...parsed };
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

  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);

    return (fenced ? fenced[1] : trimmed).trim();
  }
}
