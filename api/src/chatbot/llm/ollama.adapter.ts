import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import type { EnvVariable } from '../../config/env.validation';
import { LlmParseResultSchema, type LlmParseResult } from '../dto/chat.dto';
import type { CatalogEntry, LlmProvider } from './llm.port';

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          shopProductId: { type: 'string' },
          productName: { type: 'string' },
          qtyChange: { type: 'integer' },
        },
        required: ['shopProductId', 'productName', 'qtyChange'],
      },
    },
  },
  required: ['items'],
};

@Injectable()
export class OllamaLlmAdapter implements LlmProvider {
  private client: Ollama | null = null;

  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  async parseStockCommand(
    rawText: string,
    catalog: CatalogEntry[],
  ): Promise<LlmParseResult> {
    const model = this.configService.get('OLLAMA_MODEL', { infer: true });

    if (!model) {
      throw new ServiceUnavailableException({
        message: 'ยังไม่ได้ตั้งค่าผู้ให้บริการ AI กรุณาติดต่อผู้ดูแลระบบ',
        code: 'LLM_NOT_CONFIGURED',
      });
    }

    const response = await this.getClient().chat({
      model,
      format: RESPONSE_JSON_SCHEMA,
      messages: [
        { role: 'system', content: this.buildSystemPrompt(catalog) },
        { role: 'user', content: rawText },
      ],
    });

    return LlmParseResultSchema.parse(
      JSON.parse(this.extractJson(response.message.content)) as unknown,
    );
  }

  private extractJson(raw: string): string {
    const trimmed = raw.trim();
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);

    return (fenced ? fenced[1] : trimmed).trim();
  }

  private getClient(): Ollama {
    if (this.client) return this.client;

    const host = this.configService.get('OLLAMA_HOST', { infer: true });
    const apiKey = this.configService.get('OLLAMA_API_KEY', { infer: true });

    if (!host) {
      throw new ServiceUnavailableException({
        message: 'ยังไม่ได้ตั้งค่าผู้ให้บริการ AI กรุณาติดต่อผู้ดูแลระบบ',
        code: 'LLM_NOT_CONFIGURED',
      });
    }

    this.client = new Ollama({
      host,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });

    return this.client;
  }

  private buildSystemPrompt(catalog: CatalogEntry[]): string {
    const list = catalog
      .map((e) =>
        JSON.stringify({
          shopProductId: e.shopProductId,
          productName: e.productName,
          unit: e.unit,
        }),
      )
      .join('\n');

    return [
      'คุณเป็นตัวแปลงคำสั่งปรับสต็อกภาษาไทยเป็น JSON',
      '',
      'สินค้าที่ร้านนี้มี:',
      list || '(ร้านนี้ยังไม่มีสินค้า)',
      '',
      'ตอบเป็น JSON รูปแบบนี้เท่านั้น ห้ามมีข้อความอื่นและห้ามครอบด้วย markdown:',
      '{"items":[{"shopProductId":"...","productName":"...","qtyChange":0}]}',
      '',
      ...this.buildExamples(catalog),
      'กฎ:',
      '- ต้องมีคีย์ items เสมอ',
      '- qtyChange บวก = เพิ่มสต็อก, ลบ = ลด/ตัด/ขายออก',
      '- คัดลอก shopProductId และ productName จากรายการข้างบนแบบตรงตัว',
      '  ห้ามรวมหน่วยนับเข้าไปใน productName และห้ามใช้คำที่ผู้ใช้พิมพ์',
      '- ถ้าหาสินค้าที่ตรงไม่ได้ ห้ามเดา ให้ข้ามรายการนั้นไป',
    ].join('\n');
  }

  private buildExamples(catalog: CatalogEntry[]): string[] {
    if (catalog.length === 0) return [];

    const first = catalog[0];
    const second = catalog[1] ?? first;

    return [
      'ตัวอย่าง:',
      `ผู้ใช้: "เพิ่ม${first.productName} 3 ${first.unit}"`,
      `ตอบ: {"items":[{"shopProductId":"${first.shopProductId}","productName":"${first.productName}","qtyChange":3}]}`,
      `ผู้ใช้: "ตัด${second.productName} 2"`,
      `ตอบ: {"items":[{"shopProductId":"${second.shopProductId}","productName":"${second.productName}","qtyChange":-2}]}`,
      'ผู้ใช้: "เพิ่มสินค้าที่ไม่มีในรายการ 5"',
      'ตอบ: {"items":[]}',
      '',
    ];
  }
}
