import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { SubscriptionExpiryCron } from './subscription-expiry.cron';
import { SubscriptionPlanSeeder } from './subscription-plan.seeder';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionPlanSeeder,
    SubscriptionExpiryCron,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
