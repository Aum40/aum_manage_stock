import { Global, Module } from '@nestjs/common';
import { AccountContextService } from './access/account-context.service';
import {
  PRODUCT_QUOTA_PROVIDER,
  SubscriptionProductQuotaAdapter,
} from './quota/product-quota.port';
import {
  PrismaShopAccessAdapter,
  SHOP_ACCESS_PROVIDER,
} from './shop-access/shop-access.port';

@Global()
@Module({
  providers: [
    AccountContextService,
    {
      provide: PRODUCT_QUOTA_PROVIDER,
      useClass: SubscriptionProductQuotaAdapter,
    },
    { provide: SHOP_ACCESS_PROVIDER, useClass: PrismaShopAccessAdapter },
  ],
  exports: [
    AccountContextService,
    PRODUCT_QUOTA_PROVIDER,
    SHOP_ACCESS_PROVIDER,
  ],
})
export class CommonModule {}
