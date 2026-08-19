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
import {
  UnavailableSalesProductAdapter,
  UnavailableSalesStaffAdapter,
  UnavailableSalesSubscriptionAdapter,
} from './ports/unavailable-adapters';
import {
  MockSalesProductAdapter,
  MockSalesStaffAdapter,
  MockSalesSubscriptionAdapter,
} from './ports/mock-adapters';

@Module({
  imports: [StockModule],
  controllers: [SalesController],
  providers: [
    SalesService,
    MockSalesProductAdapter,
    MockSalesStaffAdapter,
    MockSalesSubscriptionAdapter,
    UnavailableSalesProductAdapter,
    UnavailableSalesStaffAdapter,
    UnavailableSalesSubscriptionAdapter,
    {
      provide: SALES_PRODUCT_PORT,
      inject: [
        ConfigService,
        MockSalesProductAdapter,
        UnavailableSalesProductAdapter,
      ],
      useFactory: (
        config: ConfigService,
        mock: MockSalesProductAdapter,
        unavailable: UnavailableSalesProductAdapter,
      ) => (config.get<boolean>('SALES_MOCK_MODE') ? mock : unavailable),
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
        UnavailableSalesSubscriptionAdapter,
      ],
      useFactory: (
        config: ConfigService,
        mock: MockSalesSubscriptionAdapter,
        unavailable: UnavailableSalesSubscriptionAdapter,
      ) => (config.get<boolean>('SALES_MOCK_MODE') ? mock : unavailable),
    },
  ],
})
export class SalesModule {}
