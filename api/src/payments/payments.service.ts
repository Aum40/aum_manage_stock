import { EnvVariable } from '@/config/env.validation';
import { PrismaService } from '@/database/prisma.service';
import {
  PaymentPurpose,
  PaymentStatus,
} from '@/database/generated/prisma/enums';
import { PaidPlanCode } from '@/payments/dto/create-subscription-payment.dto';
import { StripeService } from '@/payments/stripe.service';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';

const PROVIDER = 'stripe';
/** Stripe คิดเงินเป็นหน่วยย่อยที่สุด — บาทต้องคูณ 100 เป็นสตางค์ */
const SATANG_PER_BAHT = 100;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  /**
   * เริ่มการชำระเงิน — ยังไม่เปลี่ยนแพ็กเกจให้ตอนนี้
   * แพ็กเกจจะเปลี่ยนก็ต่อเมื่อ Stripe ยืนยันว่าจ่ายสำเร็จแล้วผ่าน webhook
   */
  async createSubscriptionPayment(userId: string, planCode: PaidPlanCode) {
    const subscription =
      await this.subscriptionsService.getSubscriptionWithPlanOrThrow(userId);

    const targetPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: planCode },
    });
    if (!targetPlan || !targetPlan.isActive) {
      throw new NotFoundException('ไม่พบแพ็กเกจนี้');
    }
    if (targetPlan.isFree || targetPlan.durationMonths === null) {
      throw new BadRequestException('แพ็กเกจนี้ไม่ต้องชำระเงิน');
    }

    // ซื้อแพ็กเกจเดิม = ต่ออายุ / ซื้อแพ็กเกจที่ quota สูงกว่า = อัปเกรด
    // SRS ไม่มี downgrade จึงบล็อกการซื้อแพ็กเกจที่ quota ต่ำกว่าไปเลย
    const isRenewal = targetPlan.id === subscription.planId;
    if (
      !isRenewal &&
      targetPlan.includedShopQuota <= subscription.plan.includedShopQuota
    ) {
      throw new ConflictException(
        'ไม่สามารถลดระดับแพ็กเกจได้ (SRS ไม่มีเส้นทางลดแพ็กเกจ)',
      );
    }

    const purpose = isRenewal
      ? PaymentPurpose.RENEWAL
      : PaymentPurpose.NEW_SUBSCRIPTION;
    const frontendUrl = this.configService
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/$/, '');

    const session = await this.stripeService.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${frontendUrl}/account/billing?status=success`,
      cancel_url: `${frontendUrl}/account/billing?status=cancelled`,
      client_reference_id: userId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'thb',
            unit_amount: Math.round(
              Number(targetPlan.priceThb) * SATANG_PER_BAHT,
            ),
            product_data: { name: `แพ็กเกจ ${targetPlan.nameTh}` },
          },
        },
      ],
      // ผูกข้อมูลที่ webhook ต้องใช้ไว้กับ session เลย จะได้ไม่ต้องเดาทีหลัง
      metadata: { userId, planCode, purpose },
    });

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        purpose,
        amountThb: targetPlan.priceThb,
        status: PaymentStatus.PENDING,
        provider: PROVIDER,
        providerRef: session.id,
      },
    });

    return { paymentId: payment.id, checkoutUrl: session.url };
  }

  listMyPayments(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { subscription: { include: { plan: true } } },
    });
  }

  async getMyPayment(userId: string, paymentId: string) {
    // กรองด้วย userId ตั้งแต่ query กัน IDOR — ของคนอื่นต้องเป็น 404 ไม่ใช่ 403
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!payment) {
      throw new NotFoundException('ไม่พบรายการชำระเงินนี้');
    }
    return payment;
  }

  /**
   * Stripe ส่ง event ซ้ำได้เสมอ (retry เมื่อเราตอบช้าหรือพลาด) จึงต้อง
   * idempotent — ยึด providerRef เป็นตัวกันซ้ำ ถ้าจ่ายสำเร็จไปแล้วให้จบเงียบๆ
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    const event = this.stripeService.constructEvent(rawBody, signature);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.fulfillCheckout(event.data.object);
        break;
      case 'checkout.session.expired':
        await this.markFailed(event.data.object.id, PaymentStatus.FAILED);
        break;
      default:
        // event อื่นไม่เกี่ยวกับเรา ตอบ 200 ไปเฉยๆ ไม่งั้น Stripe จะ retry ไม่จบ
        this.logger.debug(`ไม่ได้จัดการ event ชนิด ${event.type}`);
    }

    return { received: true };
  }

  private async fulfillCheckout(session: Stripe.Checkout.Session) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: session.id },
    });

    if (!payment) {
      // อาจเป็น session จากระบบอื่นหรือของเก่าที่ถูกลบไปแล้ว
      this.logger.warn(`ไม่พบ payment ของ session ${session.id}`);
      return;
    }
    if (payment.status === PaymentStatus.PAID) {
      // Stripe ส่งซ้ำ — เคยยืนยันไปแล้ว ไม่ต้องต่ออายุให้อีกรอบ
      return;
    }
    if (session.payment_status !== 'paid') {
      this.logger.warn(
        `session ${session.id} ยังไม่ได้จ่าย (${session.payment_status})`,
      );
      return;
    }

    const planCode = session.metadata?.planCode;
    if (!planCode) {
      this.logger.error(`session ${session.id} ไม่มี planCode ใน metadata`);
      return;
    }

    // เปลี่ยนแพ็กเกจ + ปิดยอดชำระ ต้องอยู่ในทรานแซกชันเดียวกัน
    // ไม่งั้นอาจจ่ายเงินแล้วแต่แพ็กเกจไม่ขยับ หรือขยับแต่ไม่มีหลักฐานการจ่าย
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });

      if (payment.purpose === PaymentPurpose.RENEWAL) {
        await this.subscriptionsService.applyRenewal(payment.userId, tx);
      } else {
        await this.subscriptionsService.applyUpgrade(
          payment.userId,
          planCode,
          tx,
        );
      }
    });

    this.logger.log(
      `ชำระเงินสำเร็จ payment=${payment.id} user=${payment.userId} plan=${planCode}`,
    );
  }

  private async markFailed(providerRef: string, status: PaymentStatus) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef },
    });
    if (!payment || payment.status !== PaymentStatus.PENDING) {
      return;
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });
  }
}
