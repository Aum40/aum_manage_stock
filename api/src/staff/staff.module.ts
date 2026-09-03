import { Module } from '@nestjs/common';

import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ShopStaffController } from './shop-staff.controller';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [StaffController, ShopStaffController],
  providers: [StaffService],
})
export class StaffModule {}
