import { Injectable, Logger } from '@nestjs/common';

/**
 * PORT — จำนวนสินค้า active สูงสุดตามแพ็กเกจของเจ้าของร้าน
 * เจ้าของจริงคือ feature/subscriptions-resource (พี่ปาน)
 * เราผูกกับ interface นี้ไว้ก่อน จะได้ไม่ต้องรอ
 */
export const PRODUCT_QUOTA_PROVIDER = Symbol('PRODUCT_QUOTA_PROVIDER');

export interface ProductQuotaProvider {
  /** คืน null = ไม่จำกัด */
  getMaxActiveProducts(ownerId: string): Promise<number | null>;
}

/** โควตาสินค้า active ตามแพ็กเกจ (endpoint sheet: Free 100 / Plus 3,000 / Pro 5,000) */
export const PLAN_MAX_ACTIVE_PRODUCTS = {
  FREE: 100,
  PLUS: 3_000,
  PRO: 5_000,
} as const;

export const FREE_PLAN_MAX_ACTIVE_PRODUCTS = PLAN_MAX_ACTIVE_PRODUCTS.FREE;

/**
 * ⚠️ ADAPTER ชั่วคราว — สมมติว่าทุกคนเป็น Free Plan
 * อ่านค่าทับได้จาก env PRODUCT_QUOTA_MAX_ACTIVE (ใส่ 0 = ไม่จำกัด สำหรับเทสต์)
 *
 * เมื่อ subscriptions เข้า dev แล้ว เปลี่ยนเป็น adapter ที่ query
 * subscriptions -> subscription_plans.max_active_products แทน
 */
@Injectable()
export class StaticProductQuotaAdapter implements ProductQuotaProvider {
  private readonly logger = new Logger(StaticProductQuotaAdapter.name);
  private warned = false;

  getMaxActiveProducts(): Promise<number | null> {
    if (!this.warned) {
      this.logger.warn(
        'ใช้ StaticProductQuotaAdapter (dev เท่านั้น) — ต้องต่อกับ subscriptions ของพี่ปานก่อน deploy',
      );
      this.warned = true;
    }

    const raw = process.env.PRODUCT_QUOTA_MAX_ACTIVE;
    if (raw !== undefined && raw !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return Promise.resolve(parsed <= 0 ? null : Math.floor(parsed));
      }
    }

    return Promise.resolve(FREE_PLAN_MAX_ACTIVE_PRODUCTS);
  }
}
