import { Injectable, Logger } from '@nestjs/common';

/**
 * PORT — ตรวจว่าเจ้าของร้านคนนี้มีสิทธิ์ยุ่งกับร้านนี้ไหม
 * เจ้าของจริงคือ feature/shops-resource (พี่ปาน)
 *
 * TODO(staff): เมื่อ feature/staff-resource เข้ามาแล้ว ต้องรับ userId เพิ่ม
 * เพื่อแยกกรณีพนักงาน แล้วเช็ค staff_permissions.canManageProduct ด้วย
 */
export const SHOP_ACCESS_PROVIDER = Symbol('SHOP_ACCESS_PROVIDER');

export interface ShopAccessProvider {
  /** โยน ForbiddenException/NotFoundException ถ้าไม่มีสิทธิ์ */
  assertCanManageShopProducts(ownerId: string, shopId: string): Promise<void>;
}

/**
 * ⚠️ ADAPTER ชั่วคราว — อนุญาตทุกกรณี ใช้ระหว่าง dev เท่านั้น
 * เมื่อ shops เข้า dev แล้ว เปลี่ยนเป็น adapter ที่เช็ค shops.owner_id === ownerId
 */
@Injectable()
export class AllowAllShopAccessAdapter implements ShopAccessProvider {
  private readonly logger = new Logger(AllowAllShopAccessAdapter.name);
  private warned = false;

  assertCanManageShopProducts(): Promise<void> {
    if (!this.warned) {
      this.logger.warn(
        'ใช้ AllowAllShopAccessAdapter (dev เท่านั้น) — ยังไม่ได้เช็คสิทธิ์ร้านจริง',
      );
      this.warned = true;
    }
    return Promise.resolve();
  }
}
