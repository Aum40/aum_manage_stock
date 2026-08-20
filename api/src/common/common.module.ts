import { Global, Module } from '@nestjs/common';
import {
  PRODUCT_QUOTA_PROVIDER,
  StaticProductQuotaAdapter,
} from './quota/product-quota.port';

/**
 * จุดเดียวที่ต้องแก้เมื่อ branch ของคนอื่นเข้า dev
 *
 *   subscriptions (พี่ปาน) -> เปลี่ยน useClass ของ PRODUCT_QUOTA_PROVIDER
 *
 * service และ controller ไม่ต้องแก้แม้แต่บรรทัดเดียว
 */
@Global()
@Module({
  providers: [
    { provide: PRODUCT_QUOTA_PROVIDER, useClass: StaticProductQuotaAdapter },
  ],
  exports: [PRODUCT_QUOTA_PROVIDER],
})
export class CommonModule {}
