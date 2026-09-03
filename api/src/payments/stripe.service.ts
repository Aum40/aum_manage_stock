import { EnvVariable } from '@/config/env.validation';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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

  cancelPaymentIntent(
    id: string,
  ): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    return this.stripe.paymentIntents.cancel(id);
  }
}
