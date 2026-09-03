import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { z } from 'zod';
import type { EnvVariable } from '../../config/env.validation';
import { ParsedStockCommand, StockCommandParser } from './stock-command-parser';

/**
 * [อั้ม] intent เป็นตัวแยกว่าผู้ใช้ "สั่งแก้สต็อก" หรือ "ถามยอดคงเหลือ"
 *
 * ตอนถาม (QUERY_STOCK) จะไม่มี operation กับ quantity — สองฟิลด์นั้นจึง optional
 * แล้วค่อยบังคับตาม intent ด้วย superRefine ไม่ใช่ปล่อยให้หลุดไปพังตอนใช้งาน
 */
const llmResponseSchema = z
  .object({
    intent: z.enum(['ADJUST_STOCK', 'QUERY_STOCK']),
    operation: z.enum(['INCREASE', 'DECREASE']).optional(),
    productQuery: z.string().trim(),
    quantity: z.number().int().positive().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.intent !== 'ADJUST_STOCK') return;

    if (!value.operation) {
      ctx.addIssue({
        code: 'custom',
        path: ['operation'],
        message: 'operation is required when intent is ADJUST_STOCK',
      });
    }
    if (value.quantity === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message: 'quantity is required when intent is ADJUST_STOCK',
      });
    }
    if (!value.productQuery) {
      ctx.addIssue({
        code: 'custom',
        path: ['productQuery'],
        message: 'productQuery is required when intent is ADJUST_STOCK',
      });
    }
  });

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['ADJUST_STOCK', 'QUERY_STOCK'] },
    operation: { type: 'string', enum: ['INCREASE', 'DECREASE'] },
    productQuery: { type: 'string' },
    quantity: { type: 'integer' },
  },
  required: ['intent', 'productQuery'],
};

const SYSTEM_PROMPT = [
  'คุณเป็นตัวแปลงข้อความภาษาไทยเรื่องสต็อกสินค้าเป็น JSON',
  '',
  'ตอบเป็น JSON รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นและห้ามครอบด้วย markdown:',
  '{"intent":"ADJUST_STOCK","operation":"INCREASE","productQuery":"...","quantity":0}',
  '{"intent":"QUERY_STOCK","productQuery":"..."}',
  '',
  'ตัวอย่างสั่งปรับสต็อก:',
  'ผู้ใช้: "เพิ่มโค้ก10"',
  'ตอบ: {"intent":"ADJUST_STOCK","operation":"INCREASE","productQuery":"โค้ก","quantity":10}',
  'ผู้ใช้: "เติมน้ำเปล่า 3 ขวด"',
  'ตอบ: {"intent":"ADJUST_STOCK","operation":"INCREASE","productQuery":"น้ำเปล่า","quantity":3}',
  'ผู้ใช้: "ขายโค้กไป 2 กระป๋อง"',
  'ตอบ: {"intent":"ADJUST_STOCK","operation":"DECREASE","productQuery":"โค้ก","quantity":2}',
  'ผู้ใช้: "ลดขนมปัง 5"',
  'ตอบ: {"intent":"ADJUST_STOCK","operation":"DECREASE","productQuery":"ขนมปัง","quantity":5}',
  '',
  'ตัวอย่างถามยอดคงเหลือ:',
  'ผู้ใช้: "สินค้าคงเหลือ"',
  'ตอบ: {"intent":"QUERY_STOCK","productQuery":""}',
  'ผู้ใช้: "ตอนนี้มีของอะไรบ้าง"',
  'ตอบ: {"intent":"QUERY_STOCK","productQuery":""}',
  'ผู้ใช้: "โค้กเหลือเท่าไหร่"',
  'ตอบ: {"intent":"QUERY_STOCK","productQuery":"โค้ก"}',
  'ผู้ใช้: "เช็คสต็อกน้ำเปล่าหน่อย"',
  'ตอบ: {"intent":"QUERY_STOCK","productQuery":"น้ำเปล่า"}',
  '',
  'กฎ:',
  '- intent = QUERY_STOCK เมื่อผู้ใช้ "ถาม" ยอดคงเหลือ ไม่ได้สั่งให้แก้ตัวเลข',
  '- intent = ADJUST_STOCK เมื่อผู้ใช้สั่งเพิ่ม/เติม/ลด/ตัด/ขาย/เอาออก',
  '- QUERY_STOCK ห้ามใส่ operation และ quantity',
  '- QUERY_STOCK ถ้าถามรวมทั้งร้าน ให้ productQuery เป็นข้อความว่าง',
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

    if (parsed.intent === 'QUERY_STOCK') {
      return { intent: 'QUERY_STOCK', productQuery: parsed.productQuery };
    }

    // superRefine การันตีแล้วว่าสองฟิลด์นี้มีค่าเมื่อ intent เป็น ADJUST_STOCK
    return {
      intent: 'ADJUST_STOCK',
      operation: parsed.operation!,
      productQuery: parsed.productQuery,
      quantity: parsed.quantity!,
    };
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
