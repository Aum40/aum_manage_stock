import {
  isPaymentWindowOpen,
  MIN_CHARGE_THB,
  PAYMENT_WINDOW_HOURS,
  paymentExpiresAt,
  resolveUpgradeCharge,
} from './payment-pricing.util';

const FREE = { id: 'p-free', code: 'FREE', priceThb: 0, isFree: true };
const PLUS = { id: 'p-plus', code: 'PLUS', priceThb: 2499, isFree: false };
const PRO = { id: 'p-pro', code: 'PRO', priceThb: 3499, isFree: false };

const NOW = new Date('2026-08-28T00:00:00.000Z');
const FUTURE = new Date('2027-02-28T00:00:00.000Z');
const PAST = new Date('2026-01-01T00:00:00.000Z');

describe('resolveUpgradeCharge', () => {
  it('PLUS -> PRO ที่ยังไม่หมดอายุ เก็บเฉพาะส่วนต่างและคงวันหมดอายุเดิม', () => {
    expect(
      resolveUpgradeCharge({
        targetPlan: PRO,
        current: {
          planId: PLUS.id,
          status: 'ACTIVE',
          expiresAt: FUTURE,
          plan: PLUS,
        },
        now: NOW,
      }),
    ).toEqual({ amountThb: 1000, keepExpiry: true });
  });

  it('FREE -> PLUS จ่ายเต็ม และต้องได้รอบใหม่ (FREE ไม่เคยจ่ายอะไรมาก่อน)', () => {
    expect(
      resolveUpgradeCharge({
        targetPlan: PLUS,
        current: {
          planId: FREE.id,
          status: 'ACTIVE',
          expiresAt: null,
          plan: FREE,
        },
        now: NOW,
      }),
    ).toEqual({ amountThb: 2499, keepExpiry: false });
  });

  it('PLUS ที่หมดอายุแล้ว -> PRO จ่ายเต็ม เพราะไม่เหลือสิทธิ์ให้หัก', () => {
    expect(
      resolveUpgradeCharge({
        targetPlan: PRO,
        current: {
          planId: PLUS.id,
          status: 'ACTIVE',
          expiresAt: PAST,
          plan: PLUS,
        },
        now: NOW,
      }),
    ).toEqual({ amountThb: 3499, keepExpiry: false });
  });

  it('แพ็กเกจที่ถูกยกเลิกแล้วก็ถือว่าไม่เหลือสิทธิ์ แม้วันหมดอายุยังไม่ถึง', () => {
    expect(
      resolveUpgradeCharge({
        targetPlan: PRO,
        current: {
          planId: PLUS.id,
          status: 'CANCELLED',
          expiresAt: FUTURE,
          plan: PLUS,
        },
        now: NOW,
      }),
    ).toEqual({ amountThb: 3499, keepExpiry: false });
  });

  it('ต่ออายุแพ็กเกจเดิมจ่ายเต็ม — applyRenewal เป็นคนต่อท้ายวันหมดอายุเอง', () => {
    expect(
      resolveUpgradeCharge({
        targetPlan: PLUS,
        current: {
          planId: PLUS.id,
          status: 'ACTIVE',
          expiresAt: FUTURE,
          plan: PLUS,
        },
        now: NOW,
      }),
    ).toEqual({ amountThb: 2499, keepExpiry: false });
  });

  it('ถ้าใครตั้งราคาแพ็กเกจสูงกว่าให้ถูกกว่า ต้องไม่กลายเป็นอัปเกรดฟรี', () => {
    const cheapPro = { ...PRO, priceThb: 2000 };
    expect(
      resolveUpgradeCharge({
        targetPlan: cheapPro,
        current: {
          planId: PLUS.id,
          status: 'ACTIVE',
          expiresAt: FUTURE,
          plan: PLUS,
        },
        now: NOW,
      }),
    ).toEqual({ amountThb: MIN_CHARGE_THB, keepExpiry: true });
  });
});

describe('หน้าต่างชำระเงิน', () => {
  const createdAt = new Date('2026-08-28T00:00:00.000Z');

  it('เปิดอยู่ภายใน 24 ชั่วโมง', () => {
    const almost = new Date(createdAt.getTime() + 23 * 60 * 60 * 1000);
    expect(isPaymentWindowOpen(createdAt, almost)).toBe(true);
  });

  it('ปิดเมื่อครบ 24 ชั่วโมงพอดี', () => {
    const exactly = new Date(
      createdAt.getTime() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000,
    );
    expect(isPaymentWindowOpen(createdAt, exactly)).toBe(false);
  });

  it('paymentExpiresAt คืนเวลาหมดอายุที่ตรงกับหน้าต่างเดียวกัน', () => {
    expect(paymentExpiresAt(createdAt).toISOString()).toBe(
      '2026-08-29T00:00:00.000Z',
    );
  });
});
