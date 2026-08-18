import { BadRequestException, Injectable } from '@nestjs/common';
import { ParsedStockCommand, StockCommandParser } from './stock-command-parser';

@Injectable()
export class DeterministicStockCommandParser implements StockCommandParser {
  parse(message: string): Promise<ParsedStockCommand> {
    const normalized = message.trim().replace(/\s+/g, ' ');
    const match = /^(เพิ่ม|เติม|ลด|เอาออก)\s*(.+?)\s+(\d+)(?:\s*\S+)?$/u.exec(
      normalized,
    );
    if (!match) {
      throw new BadRequestException(
        'Unsupported stock command. Example: เพิ่มโค้ก 20 ขวด',
      );
    }
    const quantity = Number(match[3]);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }
    return Promise.resolve({
      intent: 'ADJUST_STOCK',
      operation:
        match[1] === 'ลด' || match[1] === 'เอาออก' ? 'DECREASE' : 'INCREASE',
      productQuery: match[2].trim(),
      quantity,
    });
  }
}
