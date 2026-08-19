import { Global, Module } from '@nestjs/common';
import {
  PRODUCT_QUOTA_PROVIDER,
  StaticProductQuotaAdapter,
} from './quota/product-quota.port';
import {
  AllowAllShopAccessAdapter,
  SHOP_ACCESS_PROVIDER,
} from './shop-access/shop-access.port';

/**
 * จุดเดียวที่ต้องแก้เมื่อ branch ของคนอื่นเข้า dev
 *
 *   subscriptions (พี่ปาน) -> เปลี่ยน useClass ของ PRODUCT_QUOTA_PROVIDER
 *   shops (พี่ปาน)         -> เปลี่ยน useClass ของ SHOP_ACCESS_PROVIDER
 *
 * service และ controller ไม่ต้องแก้แม้แต่บรรทัดเดียว
 */
@Global()
@Module({
  providers: [
    { provide: PRODUCT_QUOTA_PROVIDER, useClass: StaticProductQuotaAdapter },
    { provide: SHOP_ACCESS_PROVIDER, useClass: AllowAllShopAccessAdapter },
  ],
  exports: [PRODUCT_QUOTA_PROVIDER, SHOP_ACCESS_PROVIDER],
})
export class CommonModule {}
