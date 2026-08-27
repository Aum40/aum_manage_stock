import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeService } from './stripe.service';
import { SubscriptionsModule } from '@/subscriptions/subscriptions.module';

@Module({
  // webhook ต้องเรียก SubscriptionsService เพื่อเปลี่ยนแพ็กเกจหลังจ่ายสำเร็จ
  imports: [SubscriptionsModule],
  providers: [PaymentsService, StripeService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
