import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  NOTIFICATION_TYPE,
  NotificationsService,
} from './notifications.service';

/**
 * แจ้งเตือนตอนสต็อกตกลงมาถึงจุดแจ้งเตือน
 *
 * `NOTIFICATION_TYPE.LOW_STOCK` ถูกประกาศไว้ตั้งแต่ต้นแต่ไม่เคยมีโมดูลไหนยิงเลย
 * ระบบจึงรู้ว่าของใกล้หมด (คำนวณได้ทุกที่) และมีช่องทางบอก (กระดิ่งแจ้งเตือน)
 * แต่ไม่มีใครต่อสายระหว่างสองอย่าง — ตัวนี้คือสายเส้นนั้น
 *
 * **แจ้งเฉพาะตอน "ข้ามเส้น"** คือก่อนหน้ายังเหนือจุดแจ้งเตือนแล้วหลังจากนี้ต่ำกว่า
 * ไม่ใช่แจ้งทุกครั้งที่ขายของที่ต่ำอยู่แล้ว ถ้าแจ้งทุกครั้งเจ้าของร้านจะได้
 * ข้อความเดิมซ้ำสิบรอบต่อวันแล้วเลิกอ่านกระดิ่งไปเลย ซึ่งแย่กว่าไม่มีแจ้งเตือน
 *
 * `dedupeWhileUnread` เป็นตาข่ายชั้นสอง เผื่อสต็อกแกว่งขึ้นลงคร่อมเส้นหลายรอบ
 * ในวันเดียว — ตราบใดที่ยังไม่ได้อ่านอันเดิม จะไม่มีอันใหม่ซ้อนเข้ามา
 */

export interface StockChange {
  shopProductId: string;
  quantityBefore: number;
  quantityAfter: number;
}

@Injectable()
export class LowStockNotifier {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * ต้องเรียก **หลังทรานแซกชัน commit แล้วเท่านั้น** ถ้าเรียกข้างในแล้วทรานแซกชัน
   * ถูก rollback การแจ้งเตือนจะหายไปด้วย (เหตุผลเดียวกับใน products.service.ts)
   */
  async notifyIfCrossed(changes: StockChange[]): Promise<void> {
    const dropped = changes.filter(
      (change) => change.quantityAfter < change.quantityBefore,
    );
    if (dropped.length === 0) return;

    const rows = await this.prisma.shopProduct.findMany({
      where: { id: { in: dropped.map((change) => change.shopProductId) } },
      select: {
        id: true,
        lowStockThreshold: true,
        product: { select: { name: true, unit: true } },
        shop: { select: { id: true, name: true, ownerId: true } },
      },
    });
    const rowById = new Map(rows.map((row) => [row.id, row]));

    for (const change of dropped) {
      const row = rowById.get(change.shopProductId);
      if (!row) continue;

      const threshold = row.lowStockThreshold;
      // ต่ำกว่าเส้นอยู่แล้วก่อนหน้านี้ = เคยแจ้งไปแล้ว ไม่ต้องแจ้งซ้ำ
      if (change.quantityBefore <= threshold) continue;
      if (change.quantityAfter > threshold) continue;

      const outOfStock = change.quantityAfter <= 0;

      await this.notifications.emit({
        userId: row.shop.ownerId,
        shopId: row.shop.id,
        type: NOTIFICATION_TYPE.LOW_STOCK,
        title: outOfStock ? 'สินค้าหมดสต็อก' : 'สินค้าใกล้หมด',
        message: outOfStock
          ? `${row.product.name} ที่ ${row.shop.name} หมดแล้ว`
          : `${row.product.name} ที่ ${row.shop.name} เหลือ ${change.quantityAfter} ${row.product.unit} (จุดแจ้งเตือนที่ ${threshold})`,
        payload: {
          shopProductId: row.id,
          stockQty: change.quantityAfter,
          lowStockThreshold: threshold,
        },
        dedupeWhileUnread: true,
        // ไม่งั้นสินค้าตัวที่สองในร้านเดียวกันจะถูกกลืนหายไปกับตัวแรก
        dedupeScope: { shopProductId: row.id },
      });
    }
  }
}
