import { Controller, Get, Post } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  @Post('subscription')
  createSubscriptionPayment() {}

  // SRS §66/§110 — quota เปลี่ยนได้ทางเดียวคืออัปเกรดแพลน ไม่มีการซื้อร้าน/
  // สินค้า/พนักงานเพิ่มแยกต่างหาก POST /payments/shop-addon จึงถูกตัดออก
  // พร้อม EXTRA_SHOP purpose แล้ว (ดู "SRS alignment" ใน AGENTS.md)
  // ห้ามเพิ่ม endpoint ขายสิทธิ์เพิ่มกลับเข้ามา

  @Get('')
  listPayments() {}

  @Get(':id')
  getPayment() {}

  @Post('webhook')
  paymentWebhook() {}
}
