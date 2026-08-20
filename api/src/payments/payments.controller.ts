import { Controller, Get, Post } from '@nestjs/common';

@Controller('payments')
export class PaymentsController {
  @Post('subscription')
  createSubscriptionPayment() {}

  @Post('shop-addon')
  createShopAddonPayment() {}

  @Get('')
  listPayments() {}

  @Get(':id')
  getPayment() {}

  @Post('webhook')
  paymentWebhook() {}
}
