import { Module } from '@nestjs/common';

import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [ShopsController],
  providers: [ShopsService],
})
export class ShopsModule {}
