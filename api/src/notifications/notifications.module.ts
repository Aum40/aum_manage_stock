import { Module } from '@nestjs/common';
import { LowStockNotifier } from './low-stock.notifier';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, LowStockNotifier],
  exports: [NotificationsService, LowStockNotifier],
})
export class NotificationsModule {}
