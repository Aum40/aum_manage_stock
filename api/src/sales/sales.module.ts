import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StockModule } from '../stock/stock.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SALES_PRODUCT_PORT } from './ports/sales-product.port';
import {
  SALES_STAFF_PORT,
  SALES_SUBSCRIPTION_PORT,
} from './ports/sales-access.port';
import { UnavailableSalesStaffAdapter } from './ports/unavailable-adapters';
import {
  MockSalesProductAdapter,
  MockSalesStaffAdapter,
  MockSalesSubscriptionAdapter,
} from './ports/mock-adapters';
import {
  PrismaSalesProductAdapter,
  PrismaSalesSubscriptionAdapter,
} from './ports/prisma-sales-adapters';

@Module({
  imports: [StockModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    MockSalesProductAdapter,
    MockSalesStaffAdapter,
    MockSalesSubscriptionAdapter,
    PrismaSalesProductAdapter,
    UnavailableSalesStaffAdapter,
    PrismaSalesSubscriptionAdapter,
    {
      provide: SALES_PRODUCT_PORT,
      inject: [
        ConfigService,
        MockSalesProductAdapter,
        PrismaSalesProductAdapter,
      ],
      useFactory: (
        config: ConfigService,
        mock: MockSalesProductAdapter,
        actual: PrismaSalesProductAdapter,
      ) => (config.get<boolean>('SALES_MOCK_MODE') ? mock : actual),
    },
    {
      provide: SALES_STAFF_PORT,
      inject: [
        ConfigService,
        MockSalesStaffAdapter,
        UnavailableSalesStaffAdapter,
      ],
      useFactory: (
        config: ConfigService,
        mock: MockSalesStaffAdapter,
        unavailable: UnavailableSalesStaffAdapter,
      ) => (config.get<boolean>('SALES_MOCK_MODE') ? mock : unavailable),
    },
    {
      provide: SALES_SUBSCRIPTION_PORT,
      inject: [
        ConfigService,
        MockSalesSubscriptionAdapter,
        PrismaSalesSubscriptionAdapter,
      ],
      useFactory: (
        config: ConfigService,
        mock: MockSalesSubscriptionAdapter,
        actual: PrismaSalesSubscriptionAdapter,
      ) => (config.get<boolean>('SALES_MOCK_MODE') ? mock : actual),
    },
  ],
})
export class SalesModule {}
