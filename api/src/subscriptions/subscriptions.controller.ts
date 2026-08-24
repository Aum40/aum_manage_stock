import { Controller, Get } from '@nestjs/common';

import { OwnerId } from '../common/decorator/owner-id.decorator';
import { SubscriptionsService } from './subscriptions.service';

@Controller()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('subscription-plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('subscriptions/me')
  getMySubscription(@OwnerId() ownerId: string) {
    return this.subscriptionsService.getMySubscriptionSummary(ownerId);
  }

  // POST /subscriptions/upgrade และ /subscriptions/renew ถูกถอดออก
  //
  // ทั้งสองเส้นเปลี่ยนแพ็กเกจให้ทันทีโดยไม่ผ่านการชำระเงิน ซึ่งแปลว่าใครก็
  // อัปเกรดเป็น PRO ได้ฟรีแค่ยิง endpoint ตรงๆ
  //
  // ตอนนี้ย้ายไปเป็น SubscriptionsService.applyUpgrade()/applyRenewal() ที่
  // PaymentsService.handleWebhook() เรียกหลัง Stripe ยืนยันว่าจ่ายเงินสำเร็จ
  // แล้วเท่านั้น และ commit พร้อมการปิดยอดชำระในทรานแซกชันเดียว ตามที่ ER
  // note ของ subscriptions กำหนดไว้
  //
  // ฝั่งผู้ใช้เริ่มจ่ายเงินที่ POST /payments/subscription { planCode } แทน
}
