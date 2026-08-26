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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  /** สร้าง PaymentIntent สำหรับฟอร์มบัตรบนเว็บ โดยไม่ใช้หน้า Stripe Checkout */
  async createSubscriptionPaymentIntent(
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
    if (
      targetPlan.id !== subscription.planId &&
      targetPlan.includedShopQuota <= subscription.plan.includedShopQuota
    ) {
      throw new ConflictException(
        'ไม่สามารถลดระดับแพ็กเกจได้ (SRS ไม่มีเส้นทางลดแพ็กเกจ)',
      );
    }

    const purpose =
      targetPlan.id === subscription.planId
        ? PaymentPurpose.RENEWAL
        : PaymentPurpose.NEW_SUBSCRIPTION;

    // ปิดใบเก่าที่ค้างก่อนออกใบใหม่ (ดูคอมเมนต์ของเมธอด)
    await this.cancelPendingIntents(userId, reusePaymentId);

    const intent = await this.stripeService.createCardPaymentIntent(
      Number(targetPlan.priceThb),
      { userId, planCode, purpose },
    );
    if (!intent.client_secret) {
      throw new BadRequestException('Stripe ไม่ได้ส่ง client secret กลับมา');
    }

    const payment = reusePaymentId
      ? await this.prisma.payment.update({
          where: { id: reusePaymentId },
          data: {
            subscriptionId: subscription.id,
            purpose,
            amountThb: targetPlan.priceThb,
            status: PaymentStatus.PENDING,
            provider: PROVIDER,
            providerRef: intent.id,
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
            providerRef: intent.id,
          },
        });

    return { paymentId: payment.id, clientSecret: intent.client_secret };
  }

  async listMyPayments(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { subscription: { include: { plan: true } } },
    });

    // แบบ Learnora ไม่มี webhook: ถ้าผู้ใช้ปิดหน้าเว็บหลังจ่ายสำเร็จ
    // รอบถัดไปที่เปิดประวัติจะตรวจ PaymentIntent ที่ยัง PENDING แล้วบันทึกให้
    const pendingIntents = payments.filter(
      (payment) =>
        payment.status === PaymentStatus.PENDING &&
        payment.providerRef.startsWith('pi_'),
    );
    await Promise.all(
      pendingIntents.map(async (payment) => {
        try {
          const intent = await this.stripeService.retrievePaymentIntent(
            payment.providerRef,
          );
          if (intent.status === 'succeeded') {
            await this.fulfillPaymentIntent(intent);
          }
        } catch {
          // รายการเก่าหรือ Stripe ชั่วคราวไม่พร้อม ไม่ควรทำให้ประวัติหาย
        }
      }),
    );

    return pendingIntents.some(
      (payment) => payment.status === PaymentStatus.PENDING,
    )
      ? this.prisma.payment.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { subscription: { include: { plan: true } } },
        })
      : payments;
  }

  async retryPaymentIntent(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });
    if (!payment) throw new NotFoundException('ไม่พบรายการชำระเงินนี้');
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.FAILED
    ) {
      throw new BadRequestException('รายการนี้ไม่สามารถชำระซ้ำได้');
    }

    let planCode: string | null = null;
    try {
      const intent = await this.stripeService.retrievePaymentIntent(
        payment.providerRef,
      );
      planCode = intent.metadata?.planCode ?? null;
    } catch {
      // รองรับรายการเก่าที่สร้างจาก Checkout Session
      try {
        const session =
          await this.stripeService.stripe.checkout.sessions.retrieve(
            payment.providerRef,
          );
        planCode = session.metadata?.planCode ?? null;
      } catch {
        // ถ้าเป็นรายการจาก Stripe account/mode เก่า ให้ใช้ยอดเงินใน ledger
        // หาแพ็กเกจแทน เพื่อให้ผู้ใช้เปิด PaymentIntent ใบใหม่ได้
        const plan = await this.prisma.subscriptionPlan.findFirst({
          where: { priceThb: payment.amountThb, isActive: true },
          select: { code: true },
        });
        planCode = plan?.code ?? null;
      }
    }
    if (planCode !== 'PLUS' && planCode !== 'PRO') {
      throw new BadRequestException('ไม่พบแพ็กเกจของรายการชำระเงินนี้');
    }
    return this.createSubscriptionPaymentIntent(userId, planCode, payment.id);
  }

  /** ยืนยันแบบ Learnora: ตรวจ PaymentIntent กับ Stripe แล้วอัปเดต DB ทันที */
  async confirmPaymentIntent(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, userId },
    });
    if (!payment) throw new NotFoundException('ไม่พบรายการชำระเงินนี้');
    if (payment.status === PaymentStatus.PAID) {
      return { message: 'รายการนี้ชำระเงินแล้ว' };
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'รายการนี้ไม่อยู่ระหว่างรอยืนยันการชำระเงิน',
      );
    }

    const intent = await this.stripeService.retrievePaymentIntent(
      payment.providerRef,
    );
    const expectedAmount = Math.round(
      Number(payment.amountThb) * SATANG_PER_BAHT,
    );
    if (
      intent.metadata?.userId !== userId ||
      intent.metadata?.planCode === undefined
    ) {
      throw new BadRequestException('ข้อมูลการชำระเงินไม่ตรงกับบัญชีนี้');
    }
    if (intent.status !== 'succeeded') {
      throw new BadRequestException('Stripe ยังยืนยันการชำระเงินไม่สำเร็จ');
    }
    if (intent.amount_received !== expectedAmount) {
      throw new BadRequestException('ยอดชำระเงินไม่ตรงกับแพ็กเกจ');
    }

    await this.fulfillPaymentIntent(intent);
    return { message: 'ชำระเงินสำเร็จ' };
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
      case 'payment_intent.succeeded':
        await this.fulfillPaymentIntent(event.data.object);
        break;
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await this.markFailed(event.data.object.id, PaymentStatus.FAILED);
        break;
      default:
        // event อื่นไม่เกี่ยวกับเรา ตอบ 200 ไปเฉยๆ ไม่งั้น Stripe จะ retry ไม่จบ
        this.logger.debug(`ไม่ได้จัดการ event ชนิด ${event.type}`);
    }

    return { received: true };
  }

  private async fulfillPaymentIntent(intent: Stripe.PaymentIntent) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: intent.id },
    });
    if (!payment || payment.status !== PaymentStatus.PENDING) return;

    const planCode = intent.metadata?.planCode;
    if (!planCode || (planCode !== 'PLUS' && planCode !== 'PRO')) {
      this.logger.error(
        `payment intent ${intent.id} ไม่มี planCode ที่ถูกต้อง`,
      );
      return;
    }

    let applied: boolean;
    try {
      applied = await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: PaymentStatus.PENDING },
          data: { status: PaymentStatus.PAID, paidAt: new Date() },
        });
        if (claimed.count === 0) return false;

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

    if (applied) {
      this.logger.log(
        `ชำระเงินสำเร็จ payment=${payment.id} user=${payment.userId} plan=${planCode}`,
      );
    }
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
   * ยกเลิก PaymentIntent เก่าที่ผู้ใช้คนเดิมยังไม่ได้จ่าย ก่อนออกใบใหม่ให้
   *
   * ถ้าไม่ยกเลิก คนที่กดซื้อ PLUS แล้วเปลี่ยนใจไปซื้อ PRO จะเหลือ intent ของ
   * PLUS ค้างอยู่ ทั้งใน Stripe และเป็นแถว PENDING ในประวัติ — แถวนั้นยังจ่าย
   * ได้จริงถ้ามี client secret เก่าอยู่ในมือ แล้วจะกลายเป็นการลดแพ็กเกจซึ่ง
   * SRS ไม่รองรับ
   *
   * best-effort — ถ้ายกเลิกฝั่ง Stripe ไม่สำเร็จ (เช่นถูกยกเลิกไปแล้ว) ก็ยัง
   * ปิดแถวฝั่งเราให้เรียบร้อย ไม่บล็อกการซื้อรอบใหม่
   */
  private async cancelPendingIntents(userId: string, exceptPaymentId?: string) {
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
        await this.stripeService.cancelPaymentIntent(item.providerRef);
      } catch (error) {
        this.logger.warn(
          `ยกเลิก payment intent ${item.providerRef} ไม่สำเร็จ: ${
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
