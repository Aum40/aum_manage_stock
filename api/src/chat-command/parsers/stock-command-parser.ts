export const STOCK_COMMAND_PARSER = Symbol('STOCK_COMMAND_PARSER');

/** สั่งปรับสต็อก — ต้องให้ผู้ใช้ยืนยันก่อนบันทึกเสมอ */
export interface ParsedStockAdjustCommand {
  intent: 'ADJUST_STOCK';
  operation: 'INCREASE' | 'DECREASE';
  productQuery: string;
  quantity: number;
}

/**
 * [อั้ม] ถามยอดคงเหลือ — อ่านอย่างเดียว ไม่ต้องสร้าง PendingAction และไม่ต้องยืนยัน
 *
 * productQuery ว่าง = ถามทั้งร้าน ("สินค้าคงเหลือ")
 * productQuery มีค่า = ถามเจาะจง ("โค้กเหลือเท่าไหร่")
 */
export interface ParsedStockQueryCommand {
  intent: 'QUERY_STOCK';
  productQuery: string;
}

export type ParsedStockCommand =
  ParsedStockAdjustCommand | ParsedStockQueryCommand;

export interface StockCommandParser {
  parse(message: string): Promise<ParsedStockCommand>;
}
