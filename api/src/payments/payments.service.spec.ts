import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import {
  PaymentPurpose,
  PaymentStatus,
} from '../database/generated/prisma/enums';

/** expect.any() คืน any — ห่อให้เป็น unknown เพื่อไม่ให้ชน no-unsafe-assignment */
const anyDate = (): unknown => expect.any(Date);

/** expect.objectContaining() คืน any — ห่อเป็น unknown กัน no-unsafe-assignment */
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const USER = '0199a0e0-0000-7000-8000-000000000001';
const OTHER = '0199a0e0-0000-7000-8000-000000000002';
const PAYMENT = '0199a0e0-0000-7000-8000-000000000100';
const SUB = '0199a0e0-0000-7000-8000-000000000200';

const FREE = { id: 'p-free', code: 'FREE', includedShopQuota: 1 };
const PLUS = {
  id: 'p-plus',
  code: 'PLUS',
  nameTh: 'พลัส',
  priceThb: 2499,
  durationMonths: 12,
  includedShopQuota: 3,
  isFree: false,
  isActive: true,
};
const PRO = {
  id: 'p-pro',
  code: 'PRO',
  nameTh: 'โปร',
  priceThb: 3499,
  durationMonths: 12,
  includedShopQuota: 5,
  isFree: false,
  isActive: true,
};

function intent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi_test_1',
    status: 'succeeded',
    amount_received: 249900,
    client_secret: 'pi_test_1_secret',
    metadata: { userId: USER, planCode: 'PLUS' },
    ...overrides,
  } as never;
}

describe('PaymentsService', () => {
  let prisma: {
    payment: Record<string, jest.Mock>;
    subscriptionPlan: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let stripe: {
    createCardPaymentIntent: jest.Mock;
    retrievePaymentIntent: jest.Mock;
    cancelPaymentIntent: jest.Mock;
  };
  let subscriptions: {
    getSubscriptionWithPlanOrThrow: jest.Mock;
    applyUpgrade: jest.Mock;
    applyRenewal: jest.Mock;
  };
  let service: PaymentsService;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    prisma = {
      payment: {
        create: jest.fn().mockResolvedValue({ id: PAYMENT }),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      subscriptionPlan: { findUnique: jest.fn() },
      // ทรานแซกชันแบบ interactive — เรียก callback ด้วย tx จำลอง
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    stripe = {
      createCardPaymentIntent: jest.fn().mockResolvedValue(intent()),
      retrievePaymentIntent: jest.fn().mockResolvedValue(intent()),
      cancelPaymentIntent: jest.fn().mockResolvedValue({}),
    };
    subscriptions = {
      getSubscriptionWithPlanOrThrow: jest.fn(),
      applyUpgrade: jest.fn(),
      applyRenewal: jest.fn(),
    };

    service = new PaymentsService(
      prisma as never,
      stripe as never,
      subscriptions as never,
      { get: jest.fn(() => 'https://app.example.com/') } as never,
    );
    errorLog = silenceLogger(service);
  });

  /** เงียบ log ระหว่างเทสต์ แต่ยังตรวจได้ว่า error ถูกเรียก */
  function silenceLogger(target: PaymentsService): jest.SpyInstance {
    const logger = target['logger'];
    jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    return jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  }

  describe('createSubscriptionPaymentIntent', () => {
    function onPlan(plan: typeof FREE | typeof PLUS | typeof PRO) {
      subscriptions.getSubscriptionWithPlanOrThrow.mockResolvedValue({
        id: SUB,
        planId: plan.id,
        plan,
      });
    }

    it('ตอบ 404 เมื่อไม่มีแพ็กเกจนี้ในระบบ', async () => {
      onPlan(FREE);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.createSubscriptionPaymentIntent(USER, 'PLUS'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    // SRS §66/§110 — ไม่มีเส้นทางลดแพ็กเกจ
    it('บล็อกการซื้อแพ็กเกจที่ quota ต่ำกว่าแพ็กเกจปัจจุบัน', async () => {
      onPlan(PRO);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PLUS);

      await expect(
        service.createSubscriptionPaymentIntent(USER, 'PLUS'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(stripe.createCardPaymentIntent).not.toHaveBeenCalled();
    });

    it('ซื้อแพ็กเกจเดิม = ต่ออายุ (purpose RENEWAL)', async () => {
      onPlan(PLUS);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PLUS);

      await service.createSubscriptionPaymentIntent(USER, 'PLUS');

      expect(prisma.payment.create).toHaveBeenCalledWith(
        containing({
          data: containing({
            purpose: PaymentPurpose.RENEWAL,
            status: PaymentStatus.PENDING,
            providerRef: 'pi_test_1',
          }),
        }),
      );
    });

    it('ซื้อแพ็กเกจที่สูงกว่า = อัปเกรด (purpose NEW_SUBSCRIPTION)', async () => {
      onPlan(FREE);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PRO);

      await service.createSubscriptionPaymentIntent(USER, 'PRO');

      expect(prisma.payment.create).toHaveBeenCalledWith(
        containing({
          data: containing({ purpose: PaymentPurpose.NEW_SUBSCRIPTION }),
        }),
      );
    });

    it('ยังไม่เปลี่ยนแพ็กเกจให้ตอนเปิดรายการชำระเงิน', async () => {
      onPlan(FREE);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PLUS);

      await service.createSubscriptionPaymentIntent(USER, 'PLUS');

      expect(subscriptions.applyUpgrade).not.toHaveBeenCalled();
      expect(subscriptions.applyRenewal).not.toHaveBeenCalled();
    });

    it('ส่งราคาเป็นบาทให้ StripeService แปลงเป็นสตางค์', async () => {
      onPlan(FREE);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PLUS);

      await service.createSubscriptionPaymentIntent(USER, 'PLUS');

      expect(stripe.createCardPaymentIntent).toHaveBeenCalledWith(2499, {
        userId: USER,
        planCode: 'PLUS',
        purpose: PaymentPurpose.NEW_SUBSCRIPTION,
      });
    });

    it('คืน client secret ให้ฟอร์มบัตรใช้ต่อ', async () => {
      onPlan(FREE);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PLUS);

      await expect(
        service.createSubscriptionPaymentIntent(USER, 'PLUS'),
      ).resolves.toEqual({
        paymentId: PAYMENT,
        clientSecret: 'pi_test_1_secret',
      });
    });

    // ใบเก่าที่ค้างคือต้นเหตุของเคส "จ่ายใบ PLUS เก่าหลังอัปเป็น PRO ไปแล้ว"
    it('ยกเลิกใบที่ค้างอยู่ก่อนเปิดใบใหม่', async () => {
      onPlan(FREE);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PLUS);
      prisma.payment.findMany.mockResolvedValue([
        { id: 'old', providerRef: 'pi_old' },
      ]);
      prisma.payment.findUnique.mockResolvedValue({
        id: 'old',
        status: PaymentStatus.PENDING,
      });

      await service.createSubscriptionPaymentIntent(USER, 'PLUS');

      expect(stripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_old');
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'old' },
        data: { status: PaymentStatus.FAILED },
      });
    });

    it('ปิดแถวฝั่งเราต่อได้แม้ Stripe ยกเลิกใบเก่าไม่สำเร็จ', async () => {
      onPlan(FREE);
      prisma.subscriptionPlan.findUnique.mockResolvedValue(PLUS);
      prisma.payment.findMany.mockResolvedValue([
        { id: 'old', providerRef: 'pi_old' },
      ]);
      prisma.payment.findUnique.mockResolvedValue({
        id: 'old',
        status: PaymentStatus.PENDING,
      });
      stripe.cancelPaymentIntent.mockRejectedValue(
        new Error('already canceled'),
      );

      await expect(
        service.createSubscriptionPaymentIntent(USER, 'PLUS'),
      ).resolves.toEqual(
        expect.objectContaining({ clientSecret: 'pi_test_1_secret' }),
      );
      expect(prisma.payment.update).toHaveBeenCalled();
    });
  });

  describe('confirmPaymentIntent', () => {
    function pendingRow(overrides: Record<string, unknown> = {}) {
      return {
        id: PAYMENT,
        userId: USER,
        status: PaymentStatus.PENDING,
        purpose: PaymentPurpose.NEW_SUBSCRIPTION,
        amountThb: 2499,
        providerRef: 'pi_test_1',
        ...overrides,
      };
    }

    it('ปฏิเสธเมื่อ intent เป็นของบัญชีอื่น', async () => {
      prisma.payment.findFirst.mockResolvedValue(pendingRow());
      stripe.retrievePaymentIntent.mockResolvedValue(
        intent({ metadata: { userId: OTHER, planCode: 'PLUS' } }),
      );

      await expect(
        service.confirmPaymentIntent(USER, PAYMENT),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(subscriptions.applyUpgrade).not.toHaveBeenCalled();
    });

    it('ปฏิเสธเมื่อ Stripe ยังไม่ยืนยันว่าจ่ายสำเร็จ', async () => {
      prisma.payment.findFirst.mockResolvedValue(pendingRow());
      stripe.retrievePaymentIntent.mockResolvedValue(
        intent({ status: 'requires_payment_method' }),
      );

      await expect(
        service.confirmPaymentIntent(USER, PAYMENT),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    // กันคนจ่ายน้อยกว่าราคาแพ็กเกจแล้วอ้างว่าจ่ายครบ
    it('ปฏิเสธเมื่อยอดที่จ่ายไม่ตรงกับราคาแพ็กเกจ', async () => {
      prisma.payment.findFirst.mockResolvedValue(pendingRow());
      stripe.retrievePaymentIntent.mockResolvedValue(
        intent({ amount_received: 100 }),
      );

      await expect(
        service.confirmPaymentIntent(USER, PAYMENT),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ผ่านครบทุกด่านแล้วจึงอัปเกรดให้', async () => {
      prisma.payment.findFirst.mockResolvedValue(pendingRow());
      prisma.payment.findUnique.mockResolvedValue(pendingRow());

      await expect(
        service.confirmPaymentIntent(USER, PAYMENT),
      ).resolves.toEqual({ message: 'ชำระเงินสำเร็จ' });
      expect(subscriptions.applyUpgrade).toHaveBeenCalledWith(
        USER,
        'PLUS',
        prisma,
      );
    });

    it('รายการที่ปิดยอดไปแล้วตอบกลับเฉยๆ ไม่อัปเกรดซ้ำ', async () => {
      prisma.payment.findFirst.mockResolvedValue(
        pendingRow({ status: PaymentStatus.PAID }),
      );

      await service.confirmPaymentIntent(USER, PAYMENT);

      expect(subscriptions.applyUpgrade).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook — payment_intent.succeeded', () => {
    function pending(overrides: Record<string, unknown> = {}) {
      return {
        id: PAYMENT,
        userId: USER,
        status: PaymentStatus.PENDING,
        purpose: PaymentPurpose.NEW_SUBSCRIPTION,
        ...overrides,
      };
    }

    async function fulfill(object = intent()) {
      // เรียกผ่าน handleWebhook เพื่อครอบ flow จริงตั้งแต่ตรวจลายเซ็น
      const stripeService = {
        ...stripe,
        constructEvent: jest.fn(() => ({
          type: 'payment_intent.succeeded',
          data: { object },
        })),
      };
      service = new PaymentsService(
        prisma as never,
        stripeService as never,
        subscriptions as never,
        { get: jest.fn(() => 'https://app.example.com') } as never,
      );
      errorLog = silenceLogger(service);
      return service.handleWebhook(Buffer.from('{}'), 'sig');
    }

    it('เปลี่ยนแพ็กเกจและปิดยอดในทรานแซกชันเดียว', async () => {
      prisma.payment.findUnique.mockResolvedValue(pending());

      await fulfill();

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: PAYMENT, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.PAID, paidAt: anyDate() },
      });
      expect(subscriptions.applyUpgrade).toHaveBeenCalledWith(
        USER,
        'PLUS',
        prisma,
      );
    });

    it('purpose RENEWAL เรียกต่ออายุ ไม่ใช่อัปเกรด', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        pending({ purpose: PaymentPurpose.RENEWAL }),
      );

      await fulfill();

      expect(subscriptions.applyRenewal).toHaveBeenCalled();
      expect(subscriptions.applyUpgrade).not.toHaveBeenCalled();
    });

    it('Stripe ส่ง event ซ้ำ (แถวปิดยอดไปแล้ว) ต้องไม่ต่ออายุซ้ำ', async () => {
      prisma.payment.findUnique.mockResolvedValue(
        pending({ status: PaymentStatus.PAID }),
      );

      await expect(fulfill()).resolves.toEqual({ received: true });
      expect(subscriptions.applyUpgrade).not.toHaveBeenCalled();
    });

    // สอง webhook ที่วิ่งพร้อมกันจะอ่านเจอ PENDING ทั้งคู่ ตัวที่จองแถวไม่ทัน
    // จะได้ count = 0 แล้วต้องถอยออกโดยไม่ต่ออายุให้อีกรอบ
    it('กัน webhook ซ้ำที่วิ่งพร้อมกันด้วยการจองแถวใน tx', async () => {
      prisma.payment.findUnique.mockResolvedValue(pending());
      prisma.payment.updateMany.mockResolvedValue({ count: 0 });

      await fulfill();

      expect(subscriptions.applyUpgrade).not.toHaveBeenCalled();
    });

    it('ไม่พัง เมื่อไม่พบ payment ของ intent นี้', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);

      await expect(fulfill()).resolves.toEqual({ received: true });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // เงินถูกตัดแล้วแต่เปลี่ยนแพ็กเกจไม่ได้ (เช่นจ่ายใบ PLUS เก่าหลังอัปเป็น
    // PRO ไปแล้ว) retry อีกกี่ครั้งก็ไม่ผ่าน — ต้องบันทึกไว้แล้วตอบ 200
    it('บันทึกเป็น PAID + ตอบ 200 เมื่อจ่ายแล้วแต่เปลี่ยนแพ็กเกจไม่ได้', async () => {
      prisma.payment.findUnique.mockResolvedValue(pending());
      subscriptions.applyUpgrade.mockRejectedValue(
        new ConflictException('ลดแพ็กเกจไม่ได้'),
      );

      await expect(fulfill()).resolves.toEqual({ received: true });

      expect(prisma.payment.updateMany).toHaveBeenLastCalledWith({
        where: { id: PAYMENT, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.PAID, paidAt: anyDate() },
      });
      expect(errorLog).toHaveBeenCalled();
    });

    // ตรงข้ามกัน: DB ล่ม/timeout เป็นความผิดพลาดชั่วคราว ต้องปล่อยให้ throw
    // เพื่อให้ Stripe retry ตามปกติ
    it('โยน error ต่อเมื่อเป็นความผิดพลาดชั่วคราว เพื่อให้ Stripe retry', async () => {
      prisma.payment.findUnique.mockResolvedValue(pending());
      subscriptions.applyUpgrade.mockRejectedValue(new Error('DB timeout'));

      await expect(fulfill()).rejects.toThrow('DB timeout');
    });
  });

  describe('การอ่านประวัติการชำระเงิน', () => {
    it('ตอบ 404 (ไม่ใช่ 403) เมื่อเป็นรายการของคนอื่น เพื่อกัน IDOR', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.getMyPayment(OTHER, PAYMENT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.payment.findFirst).toHaveBeenCalledWith(
        containing({ where: { id: PAYMENT, userId: OTHER } }),
      );
    });

    it('listMyPayments กรองด้วย userId เสมอ', async () => {
      await service.listMyPayments(USER);

      expect(prisma.payment.findMany).toHaveBeenCalledWith(
        containing({ where: { userId: USER } }),
      );
    });
  });
});
