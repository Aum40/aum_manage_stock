import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentExpiryCron } from './payment-expiry.cron';
import { StripeService } from './stripe.service';
import { SubscriptionsModule } from '@/subscriptions/subscriptions.module';

@Module({
  // ยืนยันการชำระเงินแล้วต้องเรียก SubscriptionsService เพื่อเปลี่ยนแพ็กเกจ
  imports: [SubscriptionsModule],
  providers: [PaymentsService, StripeService, PaymentExpiryCron],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
