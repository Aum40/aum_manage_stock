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
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Stripe from 'stripe';

const PROVIDER = 'stripe';
/** Stripe คิดเงินเป็นหน่วยย่อยที่สุด — บาทต้องคูณ 100 เป็นสตางค์ */
const SATANG_PER_BAHT = 100;

/**
 * อายุของลิงก์จ่ายเงิน — Stripe เปิด Checkout Session ได้นานสูงสุด 24 ชั่วโมง
 * จึงให้ผู้ใช้มีเวลาชำระภายในหนึ่งวันเต็ม หลังจากนั้น Stripe จะส่ง
 * checkout.session.expired ให้เราเปลี่ยนรายการจาก PENDING เป็น FAILED
 */
const CHECKOUT_TTL_MINUTES = 24 * 60;
const MS_PER_MINUTE = 60_000;

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
  async createSubscriptionPayment(
    userId: string,
    planCode: PaidPlanCode,
    reusePaymentId?: string,
  ) {
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

    // ปิดลิงก์จ่ายเงินเก่าที่ยังค้างอยู่ก่อนออกใบใหม่ (ดูคอมเมนต์ของเมธอด)
    await this.expirePendingCheckouts(userId, reusePaymentId);

    const session = await this.stripeService.stripe.checkout.sessions.create({
      mode: 'payment',
      /**
       * ระบุเองไม่ปล่อยให้ Stripe เลือกให้ (automatic payment methods)
       *
       * ถ้าไม่ระบุ Stripe จะหยิบทุกวิธีที่เปิดไว้ใน Dashboard มาแสดง แล้วยัง
       * เปลี่ยนไปตามอุปกรณ์ของผู้ใช้อีก (Apple Pay โผล่เฉพาะบน Safari) —
       * แปลว่าหน้าจ่ายเงินของแต่ละคนในทีมไม่เหมือนกัน และเปลี่ยนได้จาก
       * Dashboard โดยไม่มีร่องรอยใน git ล็อกไว้ตรงนี้ให้เห็นชัดกว่า
       */
      payment_method_types: ['card'],
      // ชื่อที่แสดงบนหน้า Stripe Checkout ไม่ใช่ชื่อสินค้าใน line_items
      branding_settings: {
        display_name: this.configService.get('STRIPE_CHECKOUT_DISPLAY_NAME', {
          infer: true,
        }),
      },
      // หน้า membership เป็น route จริงของเว็บ (ไม่มี /account/billing)
      success_url: `${frontendUrl}/membership?status=success`,
      cancel_url: `${frontendUrl}/membership?status=cancelled`,
      client_reference_id: userId,
      expires_at: Math.floor(
        (Date.now() + CHECKOUT_TTL_MINUTES * MS_PER_MINUTE) / 1000,
      ),
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

    const payment = reusePaymentId
      ? await this.prisma.payment.update({
          where: { id: reusePaymentId },
          data: {
            subscriptionId: subscription.id,
            purpose,
            amountThb: targetPlan.priceThb,
            status: PaymentStatus.PENDING,
            provider: PROVIDER,
            providerRef: session.id,
            paidAt: null,
          },
        })
      : await this.prisma.payment.create({
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
      take: 5,
      include: { subscription: { include: { plan: true } } },
    });
  }

  /**
   * สร้าง Checkout URL ใหม่จากรายการที่ยังค้างอยู่
   * planCode อยู่ใน metadata ของ Stripe session เพราะ Payment ledger เดิม
   * ไม่ได้เก็บแพ็กเกจเป้าหมายแยกจาก subscription ปัจจุบัน
   */
  async retryPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });
    if (!payment) {
      throw new NotFoundException('ไม่พบรายการชำระเงินนี้');
    }
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.FAILED
    ) {
      throw new BadRequestException('รายการนี้ไม่สามารถชำระซ้ำได้');
    }

    const session = await this.stripeService.stripe.checkout.sessions.retrieve(
      payment.providerRef,
    );
    const planCode = session.metadata?.planCode;
    if (planCode !== 'PLUS' && planCode !== 'PRO') {
      throw new BadRequestException('ไม่พบแพ็กเกจของรายการชำระเงินนี้');
    }

    return this.createSubscriptionPayment(userId, planCode, payment.id);
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
    if (payment.status !== PaymentStatus.PENDING) {
      // Stripe ส่งซ้ำ — แถวนี้ปิดยอดไปแล้ว ไม่ต้องต่ออายุให้อีกรอบ
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

    let applied: boolean;
    try {
      // เปลี่ยนแพ็กเกจ + ปิดยอดชำระ ต้องอยู่ในทรานแซกชันเดียวกัน
      // ไม่งั้นอาจจ่ายเงินแล้วแต่แพ็กเกจไม่ขยับ หรือขยับแต่ไม่มีหลักฐานการจ่าย
      applied = await this.prisma.$transaction(async (tx) => {
        // จองสิทธิ์ปิดยอดด้วย updateMany ที่มีเงื่อนไข status = PENDING
        //
        // เช็ค status ข้างบนอย่างเดียวไม่พอ เพราะอ่านนอกทรานแซกชัน ถ้า Stripe
        // ยิง event เดียวกันมาสองครั้งพร้อมกัน ทั้งคู่จะอ่านเจอ PENDING แล้ว
        // ต่ออายุให้ซ้ำสองรอบ ที่นี่ตัวที่มาทีหลังจะได้ count = 0 แล้วถอยออกไป
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.PAID, paidAt: new Date() },
        });
        if (claimed.count === 0) {
          return false;
        }

        if (payment.purpose === PaymentPurpose.RENEWAL) {
          await this.subscriptionsService.applyRenewal(payment.userId, tx);
        } else {
          await this.subscriptionsService.applyUpgrade(
            payment.userId,
            planCode,
            tx,
          );
        }
        return true;
      });
    } catch (error) {
      await this.recordUnfulfillablePayment(payment.id, planCode, error);
      return;
    }

    if (!applied) {
      return;
    }

    this.logger.log(
      `ชำระเงินสำเร็จ payment=${payment.id} user=${payment.userId} plan=${planCode}`,
    );
  }

  /**
   * เงินถูกตัดไปแล้วแต่เปลี่ยนแพ็กเกจให้ไม่ได้ — เกิดได้เมื่อสถานะของบัญชี
   * เปลี่ยนไประหว่างที่ลิงก์จ่ายเงินยังค้างอยู่ เช่นเปิดลิงก์ PLUS ทิ้งไว้
   * แล้วอัปเป็น PRO ก่อน พอกลับมาจ่ายลิงก์ PLUS ทีหลัง applyUpgrade() จะ
   * throw เพราะ SRS ไม่มีเส้นทางลดแพ็กเกจ
   *
   * เคสนี้ retry อีกกี่ครั้งก็ไม่มีวันผ่าน ถ้าปล่อยให้ throw ออกไปจะได้ 500
   * แล้ว Stripe จะยิงซ้ำนาน 3 วัน ส่วนแถว payment ก็ค้าง PENDING เหมือนไม่เคย
   * จ่าย — เท่ากับเงินหายโดยไม่มีหลักฐานให้ตามคืน
   *
   * จึงบันทึกเป็น PAID (เพราะจ่ายจริง) + log ระดับ error ให้แอดมินคืนเงินเอง
   * แล้วตอบ 200 กลับไปเพื่อให้ Stripe หยุด retry
   *
   * แต่ถ้าเป็นความผิดพลาดชั่วคราว (DB ล่ม/timeout) ต้องโยนต่อ เพื่อให้ Stripe
   * retry ตามปกติ — แยกด้วย HttpException ซึ่งเป็น business rule ของเราเอง
   */
  private async recordUnfulfillablePayment(
    paymentId: string,
    planCode: string,
    error: unknown,
  ) {
    if (!(error instanceof HttpException)) {
      throw error;
    }

    await this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.PAID, paidAt: new Date() },
    });

    this.logger.error(
      `payment=${paymentId} จ่ายเงินสำเร็จแล้วแต่เปลี่ยนเป็นแพ็กเกจ ${planCode} ไม่ได้ ` +
        `(${error.message}) — ต้องคืนเงินให้ผู้ใช้ด้วยมือผ่าน Stripe Dashboard`,
    );
  }

  /**
   * ปิดลิงก์จ่ายเงินเก่าที่ผู้ใช้คนเดิมยังไม่ได้จ่าย ก่อนออกลิงก์ใหม่ให้
   *
   * ถ้าไม่ปิด ผู้ใช้ที่กดซื้อ PLUS แล้วเปลี่ยนใจไปซื้อ PRO จะเหลือลิงก์ PLUS
   * ค้างอยู่ พอเผลอเปิดจ่ายทีหลังจะกลายเป็นเคสลดแพ็กเกจซึ่ง SRS ไม่รองรับ
   *
   * ทำแบบ best-effort — ถ้าปิดฝั่ง Stripe ไม่สำเร็จ (เช่นหมดอายุไปเองแล้ว)
   * ก็ยังปิดแถวฝั่งเราให้เรียบร้อย ไม่บล็อกการซื้อรอบใหม่
   */
  private async expirePendingCheckouts(userId: string, exceptPaymentId?: string) {
    const pending = await this.prisma.payment.findMany({
      where: {
        userId,
        status: PaymentStatus.PENDING,
        provider: PROVIDER,
        ...(exceptPaymentId ? { id: { not: exceptPaymentId } } : {}),
      },
      select: { id: true, providerRef: true },
    });

    for (const item of pending) {
      try {
        await this.stripeService.stripe.checkout.sessions.expire(
          item.providerRef,
        );
      } catch (error) {
        this.logger.warn(
          `ปิด checkout session ${item.providerRef} ไม่สำเร็จ: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      await this.markFailed(item.providerRef, PaymentStatus.FAILED);
    }
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
