import { BadRequestException, Injectable } from '@nestjs/common';
import { ParsedStockCommand, StockCommandParser } from './stock-command-parser';

@Injectable()
export class DeterministicStockCommandParser implements StockCommandParser {
  parse(message: string): Promise<ParsedStockCommand> {
    const normalized = message.trim().replace(/\s+/g, ' ');

    // ต้องลองคำถามก่อนคำสั่งปรับสต็อก ไม่งั้น "โค้กเหลือเท่าไหร่" จะไปเข้า
    // เส้นทางปรับสต็อกแล้วพังด้วยข้อความที่ไม่เกี่ยวกับสิ่งที่ผู้ใช้ถาม
    const query = this.parseQuery(normalized);
    if (query) return Promise.resolve(query);

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

  /**
   * [อั้ม] จับคำถามยอดคงเหลือ คืน null เมื่อไม่เข้าข่าย ให้ไปลองเส้นทางปรับสต็อกต่อ
   *
   * ตัวนี้เป็นแค่ทางลัดสำหรับรูปประโยคที่พบบ่อย — รูปที่แปลกกว่านี้ปล่อยให้ LLM
   * รับไป (FallbackStockCommandParser ลอง LLM ก่อนเสมอเมื่อตั้ง env ไว้)
   */
  private parseQuery(normalized: string): ParsedStockCommand | null {
    // ถามทั้งร้านแบบไม่มีคำว่า "เหลือ" — "เช็คสต็อก" / "ดูสินค้า"
    if (
      /^(?:ดู|เช็ค|ขอดู|ขอ)s*(?:สินค้า|ของ|สต็อก|stock)s*[?？]?$/iu.test(
        normalized,
      )
    ) {
      return { intent: 'QUERY_STOCK', productQuery: '' };
    }

    // ถามทั้งร้าน — ในประโยคไม่มีชื่อสินค้า
    if (
      /^(?:ดู|เช็ค|ขอดู|ขอ)?\s*(?:สินค้า|ของ|สต็อก|stock)?\s*(?:คงเหลือ|เหลือ|ทั้งหมด)\s*(?:เท่าไหร่|เท่าไร|กี่ชิ้น)?[?？]?$/iu.test(
        normalized,
      )
    ) {
      return { intent: 'QUERY_STOCK', productQuery: '' };
    }

    // ถามเจาะจง — "<ชื่อสินค้า> เหลือเท่าไหร่" / "<ชื่อสินค้า> คงเหลือ"
    const specific =
      /^(?:ดู|เช็ค|ขอดู|ขอ)?\s*(.+?)\s*(?:ยัง)?(?:คง)?เหลือ\s*(?:อยู่)?\s*(?:เท่าไหร่|เท่าไร|กี่\S*)?[?？]?$/u.exec(
        normalized,
      );

    if (specific) {
      const productQuery = specific[1].trim();
      // กันคำว่า "สินค้า"/"ของ" ล้วน ๆ ไม่ให้ถูกตีความเป็นชื่อสินค้า
      if (
        productQuery &&
        !/^(?:สินค้า|ของ|สต็อก|stock)$/iu.test(productQuery)
      ) {
        return { intent: 'QUERY_STOCK', productQuery };
      }
    }

    return null;
  }
}
