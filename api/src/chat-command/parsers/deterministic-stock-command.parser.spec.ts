import { BadRequestException } from '@nestjs/common';
import { DeterministicStockCommandParser } from './deterministic-stock-command.parser';

describe('DeterministicStockCommandParser', () => {
  const parser = new DeterministicStockCommandParser();

  it('parses a Thai increase command', async () => {
    await expect(parser.parse('เพิ่มโค้ก 20 ขวด')).resolves.toEqual({
      intent: 'ADJUST_STOCK',
      operation: 'INCREASE',
      productQuery: 'โค้ก',
      quantity: 20,
    });
  });

  it('parses a Thai decrease command', async () => {
    await expect(parser.parse('ลด น้ำเปล่า 3 ขวด')).resolves.toMatchObject({
      operation: 'DECREASE',
      productQuery: 'น้ำเปล่า',
      quantity: 3,
    });
  });

  it('rejects an ambiguous command', () => {
    expect(() => parser.parse('ช่วยจัดการโค้กให้หน่อย')).toThrow(
      BadRequestException,
    );
  });

  // [อั้ม] ถามยอดคงเหลือ — productQuery ว่าง = ถามทั้งร้าน
  describe('ถามยอดคงเหลือทั้งร้าน', () => {
    it.each(['สินค้าคงเหลือ', 'ของเหลือ', 'เช็คสต็อก', 'ดูสินค้าคงเหลือ'])(
      '%s',
      async (message) => {
        await expect(parser.parse(message)).resolves.toEqual({
          intent: 'QUERY_STOCK',
          productQuery: '',
        });
      },
    );
  });

  describe('ถามยอดคงเหลือเจาะจงสินค้า', () => {
    it.each([
      ['โค้กเหลือเท่าไหร่', 'โค้ก'],
      ['โค้ก เหลือ', 'โค้ก'],
      ['น้ำแร่คงเหลือ', 'น้ำแร่'],
      ['เช็คโค้กซีโร่เหลือเท่าไร', 'โค้กซีโร่'],
    ])('%s', async (message, productQuery) => {
      await expect(parser.parse(message)).resolves.toEqual({
        intent: 'QUERY_STOCK',
        productQuery,
      });
    });
  });

  /**
   * เส้นแบ่งที่สำคัญที่สุด — คำสั่งปรับสต็อกมีตัวเลขต่อท้ายเสมอ ส่วนคำถามไม่มี
   * ถ้าจับสับกันเมื่อไหร่ ผู้ใช้จะสั่งเพิ่มของแล้วได้คำตอบเป็นยอดคงเหลือแทน
   */
  it('คำสั่งที่มีจำนวน ต้องไม่ถูกตีเป็นคำถาม', async () => {
    await expect(parser.parse('เพิ่มโค้ก 10')).resolves.toMatchObject({
      intent: 'ADJUST_STOCK',
    });
    await expect(parser.parse('ลดน้ำแร่ 3')).resolves.toMatchObject({
      intent: 'ADJUST_STOCK',
    });
  });
});
