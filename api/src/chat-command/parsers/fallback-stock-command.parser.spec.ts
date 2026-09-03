import { DeterministicStockCommandParser } from './deterministic-stock-command.parser';
import { FallbackStockCommandParser } from './fallback-stock-command.parser';
import type { LlmStockCommandParser } from './llm-stock-command.parser';

describe('FallbackStockCommandParser', () => {
  let deterministic: DeterministicStockCommandParser;
  let llm: { isEnabled: jest.Mock; parse: jest.Mock };
  let parser: FallbackStockCommandParser;

  beforeEach(() => {
    deterministic = new DeterministicStockCommandParser();
    llm = { isEnabled: jest.fn().mockReturnValue(true), parse: jest.fn() };
    parser = new FallbackStockCommandParser(
      llm as unknown as LlmStockCommandParser,
      deterministic,
    );
  });

  it('ใช้ผลจาก LLM เมื่อ LLM ทำงานสำเร็จ', async () => {
    llm.parse.mockResolvedValue({
      intent: 'ADJUST_STOCK',
      operation: 'INCREASE',
      productQuery: 'โค้ก',
      quantity: 10,
    });

    await expect(parser.parse('เพิ่มโค้ก10')).resolves.toEqual({
      intent: 'ADJUST_STOCK',
      operation: 'INCREASE',
      productQuery: 'โค้ก',
      quantity: 10,
    });
  });

  it('ข้าม LLM ไปใช้ regex เมื่อยังไม่ได้ตั้งค่า env', async () => {
    llm.isEnabled.mockReturnValue(false);

    const result = await parser.parse('เพิ่มโค้ก 10 ขวด');

    expect(llm.parse).not.toHaveBeenCalled();
    expect(result).toEqual({
      intent: 'ADJUST_STOCK',
      operation: 'INCREASE',
      productQuery: 'โค้ก',
      quantity: 10,
    });
  });

  it('ตกไปใช้ regex เมื่อ LLM ล้ม (เน็ตล่ม/โควตาหมด)', async () => {
    llm.parse.mockRejectedValue(new Error('ollama unreachable'));

    const result = await parser.parse('ลดน้ำเปล่า 5 ขวด');

    expect(result).toEqual({
      intent: 'ADJUST_STOCK',
      operation: 'DECREASE',
      productQuery: 'น้ำเปล่า',
      quantity: 5,
    });
  });

  it('ถ้าทั้ง LLM และ regex ทำไม่ได้ ต้องโยน error ของ regex ออกไป', async () => {
    llm.parse.mockRejectedValue(new Error('ollama unreachable'));

    await expect(parser.parse('ข้อความที่ไม่ใช่คำสั่ง')).rejects.toThrow(
      'Unsupported stock command',
    );
  });

  // parse() ประกาศคืน Promise แต่ throw แบบ synchronous จึงต้องใช้ toThrow ไม่ใช่ rejects
  it('regex เดิมทำ "เพิ่มโค้ก10" (ไม่เว้นวรรค) ไม่ได้ — เหตุผลที่ต้องมี LLM', () => {
    expect(() => deterministic.parse('เพิ่มโค้ก10')).toThrow(
      'Unsupported stock command',
    );
  });
});
