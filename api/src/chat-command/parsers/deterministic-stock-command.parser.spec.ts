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
});
