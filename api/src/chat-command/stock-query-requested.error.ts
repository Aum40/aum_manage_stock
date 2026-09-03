import { BadRequestException } from '@nestjs/common';

/**
 * [อั้ม] "ข้อความนี้เป็นคำถามยอดคงเหลือ ไม่ใช่คำสั่งปรับสต็อก"
 *
 * โยนจาก ChatCommandService.create() แล้วให้ฝั่งช่องทาง (WEB/LINE) จับไปตอบด้วย
 * StockQueryService — พก productQuery ที่ตีความได้แล้วมาด้วย **ผู้เรียกจึงไม่ต้อง
 * parse ซ้ำ** ซึ่งสำคัญมากเพราะ parser ตัวจริงเรียก LLM ถ้า parse สองรอบทุก
 * ข้อความ เวลาตอบจะช้าขึ้นเท่าตัวและเปลืองโควตาโดยไม่จำเป็น
 *
 * สืบทอด BadRequestException เพื่อให้ REST endpoint ที่เรียก create() ตรง ๆ
 * (chat-command.controller.ts) ยังได้ 400 ตามเดิม ไม่กลายเป็น 500
 */
export class StockQueryRequestedError extends BadRequestException {
  constructor(readonly productQuery: string) {
    super('This message is a stock question, not a stock adjustment');
  }
}
