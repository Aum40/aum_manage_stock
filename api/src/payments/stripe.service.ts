import { EnvVariable } from '@/config/env.validation';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

/**
 * ห่อ Stripe SDK ไว้ที่เดียว เพื่อให้ตัว key เป็น optional ได้
 *
 * คนที่ไม่ได้ทำ payments ไม่ต้องไปหา Stripe key มาใส่ก็ boot ขึ้นปกติ
 * แต่ถ้ามีใครเรียก endpoint ของ payments โดยไม่ได้ตั้งค่า จะได้ 503
 * พร้อมข้อความบอกว่าต้องตั้ง env ตัวไหน แทนที่จะ crash ตอน start
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private client?: Stripe;

  constructor(
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  get stripe(): Stripe {
    if (!this.client) {
      const key = this.configService.get('STRIPE_SECRET_KEY', { infer: true });
      if (!key) {
        throw new ServiceUnavailableException(
          'ยังไม่ได้ตั้งค่า STRIPE_SECRET_KEY จึงใช้งานระบบชำระเงินไม่ได้',
        );
      }
      this.client = new Stripe(key);
    }
    return this.client;
  }

  createCardPaymentIntent(
    amountThb: number,
    metadata: Record<string, string>,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    return this.stripe.paymentIntents.create({
      amount: Math.round(amountThb * 100),
      currency: 'thb',
      payment_method_types: ['card'],
      metadata,
    });
  }

  retrievePaymentIntent(
    id: string,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    return this.stripe.paymentIntents.retrieve(id);
  }

  /**
   * ตรวจลายเซ็นของ webhook — ต้องใช้ raw body เท่านั้น
   * ถ้าใช้ body ที่ผ่าน JSON.parse มาแล้วลายเซ็นจะไม่ตรง เพราะ Stripe
   * เซ็นจากไบต์ดิบ (main.ts เปิด rawBody: true ไว้ให้แล้ว)
   */
  constructEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.configService.get('STRIPE_WEBHOOK_SECRET', {
      infer: true,
    });
    if (!secret) {
      throw new ServiceUnavailableException(
        'ยังไม่ได้ตั้งค่า STRIPE_WEBHOOK_SECRET จึงตรวจสอบ webhook ไม่ได้',
      );
    }

    try {
      return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      // ลายเซ็นไม่ผ่าน = ความผิดฝั่งผู้เรียก ต้องตอบ 400 ไม่ใช่ 500
      // ถ้าตอบ 5xx Stripe จะถือว่าฝั่งเราล่มแล้ว retry ซ้ำไปเรื่อยๆ ไม่จบ
      this.logger.warn(
        `ตรวจลายเซ็น webhook ไม่ผ่าน: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException('ลายเซ็น webhook ไม่ถูกต้อง');
    }
  }
}
