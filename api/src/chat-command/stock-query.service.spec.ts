import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { StockChoiceService } from './stock-choice.service';
import { StockQueryRequestedError } from './stock-query-requested.error';
import { StockQueryService } from './stock-query.service';

const SHOP_ID = '00000000-0000-0000-0000-000000000001';

function build(candidates: unknown[], totalMatches = candidates.length) {
  const findCandidates = jest
    .fn()
    .mockResolvedValue({ candidates, totalMatches });
  const choices = { findCandidates } as unknown as StockChoiceService;

  const prisma = {
    shop: { findUnique: jest.fn().mockResolvedValue({ name: 'the aum' }) },
  } as unknown as PrismaService;

  return { service: new StockQueryService(choices, prisma), findCandidates };
}

const coke = {
  shopProductId: 'a',
  name: 'โค้ก 320ml',
  unit: 'ขวด',
  stockQty: 110,
};

describe('StockQueryService', () => {
  describe('answer', () => {
    it('เจอตัวเดียว ตอบสั้น ๆ', async () => {
      const { service } = build([coke]);

      await expect(service.answer(SHOP_ID, 'โค้ก')).resolves.toBe(
        'โค้ก 320ml เหลือ 110 ขวดครับ',
      );
    });

    it('เจอหลายตัว แสดงครบทุกตัวพร้อมยอด', async () => {
      const { service } = build([
        coke,
        { ...coke, shopProductId: 'b', name: 'โค้กซีโร่', stockQty: 4 },
      ]);

      const reply = await service.answer(SHOP_ID, 'โค้ก');

      expect(reply).toContain('โค้ก 320ml — เหลือ 110 ขวด');
      expect(reply).toContain('โค้กซีโร่ — เหลือ 4 ขวด');
    });

    it('หาไม่เจอ ต้องบอกชื่อร้านด้วย', async () => {
      const { service } = build([]);

      await expect(service.answer(SHOP_ID, 'โค้ก')).resolves.toBe(
        'ไม่พบสินค้าที่ตรงกับ "โค้ก" ในร้าน the aum ครับ',
      );
    });
  });

  /**
   * คนพิมพ์ชื่อสินค้าเปล่า ๆ เพราะอยากรู้ว่าร้านมีไหม ตอบว่า "ไม่เข้าใจคำสั่ง"
   * ทั้งที่รู้อยู่แล้วว่าร้านไม่มี = ปิดบังคำตอบที่เขาต้องการ
   */
  describe('answerUnknownCommand', () => {
    it('ตรงกับสินค้าในร้าน ตอบยอดคงเหลือไปเลย', async () => {
      const { service } = build([coke]);

      await expect(
        service.answerUnknownCommand(SHOP_ID, 'โค้ก'),
      ).resolves.toEqual({
        matched: true,
        text: 'โค้ก 320ml เหลือ 110 ขวดครับ',
      });
    });

    it('ร้านไม่มีสินค้าชื่อนี้ ต้องบอกตรง ๆ พร้อมชื่อร้าน', async () => {
      const { service } = build([]);

      await expect(
        service.answerUnknownCommand(SHOP_ID, 'โค้ก'),
      ).resolves.toEqual({
        matched: false,
        text: 'ไม่พบสินค้า "โค้ก" ในร้าน the aum ครับ',
      });
    });

    it('ข้อความยาว ไม่ใช่ชื่อสินค้า ไม่ต้องเสียเวลาค้น', async () => {
      const { service, findCandidates } = build([]);
      const long = 'ก'.repeat(61);

      const result = await service.answerUnknownCommand(SHOP_ID, long);

      expect(result.matched).toBe(false);
      expect(findCandidates).not.toHaveBeenCalled();
    });
  });
});

/**
 * บั๊กที่เคยเกิดจริง: createPending ฝั่ง LINE ดัก BadRequestException แบบกว้าง ๆ
 * แล้วแปลงเป็น "ไม่เข้าใจคำสั่ง" — เพราะ StockQueryRequestedError เป็นลูกของมัน
 * คำถามยอดคงเหลือจึงถูกกลืนไปก่อนถึงตัวที่รออยู่ ทำให้ถามยอดบน LINE ไม่ได้เลย
 *
 * ทุกที่ที่ดัก BadRequestException ต้องเช็ค StockQueryRequestedError ก่อนเสมอ
 */
describe('StockQueryRequestedError', () => {
  it('เป็นลูกของ BadRequestException — ลำดับการดักจึงสำคัญ', () => {
    const error = new StockQueryRequestedError('โค้ก');

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.productQuery).toBe('โค้ก');
  });
});
