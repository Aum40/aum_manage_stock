import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Public } from '@/common/decorator/public.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { UserRole } from '@/database/generated/prisma/enums';
import { CreateSubscriptionPaymentDto } from '@/payments/dto/create-subscription-payment.dto';
import { PaymentsService } from '@/payments/payments.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** เริ่มชำระเงิน — คืน URL ของ Stripe Checkout ยังไม่เปลี่ยนแพ็กเกจตอนนี้ */
  @Roles(UserRole.SHOP_OWNER)
  @Post('subscription')
  async createSubscriptionPayment(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSubscriptionPaymentDto,
  ) {
    return this.paymentsService.createSubscriptionPayment(userId, dto.planCode);
  }

  /** เริ่มชำระเงินด้วย Card Elements — ไม่ redirect ไป Stripe Checkout */
  @Roles(UserRole.SHOP_OWNER)
  @Post('subscription-intent')
  async createSubscriptionPaymentIntent(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateSubscriptionPaymentDto,
  ) {
    return this.paymentsService.createSubscriptionPaymentIntent(
      userId,
      dto.planCode,
    );
  }

  // SRS §66/§110 — quota เปลี่ยนได้ทางเดียวคืออัปเกรดแพลน ไม่มีการซื้อร้าน/
  // สินค้า/พนักงานเพิ่มแยกต่างหาก POST /payments/shop-addon จึงถูกตัดออก
  // พร้อม EXTRA_SHOP purpose แล้ว (ดู "SRS alignment" ใน AGENTS.md)
  // ห้ามเพิ่ม endpoint ขายสิทธิ์เพิ่มกลับเข้ามา

  @Roles(UserRole.SHOP_OWNER)
  @Get('')
  async listPayments(@CurrentUser('sub') userId: string) {
    return this.paymentsService.listMyPayments(userId);
  }

  @Roles(UserRole.SHOP_OWNER)
  @Post(':id/retry')
  async retryPayment(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.retryPayment(userId, id);
  }

  @Roles(UserRole.SHOP_OWNER)
  @Post(':id/retry-intent')
  async retryPaymentIntent(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.retryPaymentIntent(userId, id);
  }

  @Roles(UserRole.SHOP_OWNER)
  @Post(':id/confirm')
  async confirmPaymentIntent(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.confirmPaymentIntent(userId, id);
  }

  @Roles(UserRole.SHOP_OWNER)
  @Get(':id')
  async getPayment(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.getMyPayment(userId, id);
  }

  /**
   * Stripe เรียกเข้ามาเอง ไม่มี token จึงต้องเป็น @Public()
   * ความปลอดภัยมาจากการตรวจลายเซ็นด้วย STRIPE_WEBHOOK_SECRET แทน
   *
   * ต้องใช้ rawBody เพราะ Stripe เซ็นจากไบต์ดิบ ถ้าใช้ body ที่ parse แล้ว
   * ลายเซ็นจะไม่ตรง (main.ts เปิด rawBody: true ไว้ให้)
   */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async paymentWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('ไม่มี header stripe-signature');
    }
    if (!request.rawBody) {
      throw new BadRequestException('อ่าน raw body ไม่ได้');
    }
    return this.paymentsService.handleWebhook(request.rawBody, signature);
  }
}
