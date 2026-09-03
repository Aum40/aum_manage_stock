import { SubscriptionStatus } from '@/subscriptions/subscription-quota.util';
import { isSubscriptionReadOnly } from '@/subscriptions/subscription-quota.util';

/**
 * ใบชำระเงินที่เปิดค้างไว้มีอายุ 24 ชั่วโมง
 *
 * พ้นกำหนดแล้ว cron จะยกเลิก PaymentIntent ฝั่ง Stripe แล้วพลิกแถวเป็น FAILED
 * ถ้าไม่ยกเลิก ผู้ใช้ที่เก็บ client secret ใบเก่าไว้ยังจ่ายได้อยู่ แล้วเงินจะ
 * เข้ามาโดยที่แถวฝั่งเราเป็น FAILED — และเพราะระบบนี้ไม่ใช้ webhook จะไม่มี
 * อะไรมาบอกเราเลยว่าเงินเข้าแล้ว เท่ากับตัดเงินแล้วไม่ได้ของแบบเงียบสนิท
 */
export const PAYMENT_WINDOW_HOURS = 24;

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * ยอดขั้นต่ำที่ Stripe รับต่อหนึ่งรายการ (สกุล THB)
 *
 * ด้วยราคาปัจจุบัน (PLUS 2,499 / PRO 3,499) ส่วนต่างคือ 1,000 บาท ไม่มีทาง
 * ต่ำกว่าขั้นต่ำอยู่แล้ว ตัวเลขนี้กันไว้เผื่อมีคนแก้ราคาแพ็กเกจในภายหลัง
 *
 * TODO(payments): ยืนยันตัวเลขนี้กับเอกสาร Stripe ของบัญชีจริงก่อน deploy
 */
export const MIN_CHARGE_THB = 20;

export interface PlanPricing {
  id: string;
  code: string;
  priceThb: number;
  isFree: boolean;
}

export interface CurrentSubscription {
  planId: string;
  status: SubscriptionStatus;
  expiresAt: Date | null;
  plan: PlanPricing;
}

export interface UpgradeCharge {
  /** ยอดที่ต้องเก็บจริงในรอบนี้ */
  amountThb: number;
  /**
   * true = คิดเฉพาะส่วนต่างจากแพ็กเกจเดิม ดังนั้นห้ามขยับวันหมดอายุ
   * false = คิดราคาเต็ม ผู้ใช้จึงต้องได้รอบใหม่เต็มระยะเวลาของแพ็กเกจ
   */
  keepExpiry: boolean;
}

/**
 * คิดยอดสำหรับการซื้อ/อัปเกรดแพ็กเกจ
 *
 * ทีมเลือกรูปแบบ "จ่ายส่วนต่าง วันหมดอายุคงเดิม" (ไม่ใช่ proration ตามจำนวน
 * วันคงเหลือแบบที่ Stripe Billing ทำให้) เพราะโปรเจกต์นี้ขายรายปีอย่างเดียว
 * ไม่มีที่นั่ง ไม่มีเส้นทางลดแพ็กเกจ การคิดตามวันจึงเพิ่มความซับซ้อนโดยไม่ได้
 * อะไรกลับมา และอธิบายให้ผู้ใช้เข้าใจยากกว่ามาก
 *
 * PLUS -> PRO ที่ยังไม่หมดอายุ  : จ่าย 3,499 - 2,499 = 1,000 วันหมดอายุเท่าเดิม
 * FREE -> PLUS/PRO             : จ่ายเต็ม เพราะ FREE ไม่เคยจ่ายอะไรมาก่อน
 * PLUS ที่หมดอายุแล้ว -> PRO    : จ่ายเต็ม เพราะไม่เหลือสิทธิ์ให้หักแล้ว
 * ต่ออายุแพ็กเกจเดิม            : จ่ายเต็ม แล้วต่อท้ายวันหมดอายุเดิม
 */
export function resolveUpgradeCharge(input: {
  targetPlan: PlanPricing;
  current: CurrentSubscription;
  now?: Date;
}): UpgradeCharge {
  const { targetPlan, current } = input;
  const fullPrice = targetPlan.priceThb;

  // ต่ออายุแพ็กเกจเดิม — applyRenewal() ต่อท้ายวันหมดอายุเดิมให้อยู่แล้ว
  if (targetPlan.id === current.planId) {
    return { amountThb: fullPrice, keepExpiry: false };
  }

  // FREE ไม่เคยจ่าย จึงไม่มีอะไรให้หัก และไม่มีวันหมดอายุให้รักษาไว้
  if (current.plan.isFree) {
    return { amountThb: fullPrice, keepExpiry: false };
  }

  // หมดอายุ/ยกเลิกไปแล้ว = ไม่เหลือสิทธิ์ค้างอยู่ ถือเป็นการซื้อใหม่
  const expired = isSubscriptionReadOnly({
    status: current.status,
    expiresAt: current.expiresAt,
    now: input.now,
  });
  if (expired || current.expiresAt === null) {
    return { amountThb: fullPrice, keepExpiry: false };
  }

  const difference = fullPrice - current.plan.priceThb;

  // ราคาแพ็กเกจที่สูงกว่าควรแพงกว่าเสมอ ถ้าไม่ใช่แปลว่ามีคนตั้งราคาผิดใน DB
  // เก็บขั้นต่ำไว้แทนการคิดศูนย์ เพื่อไม่ให้อัปเกรดฟรีโดยไม่ตั้งใจ
  return {
    amountThb: Math.max(difference, MIN_CHARGE_THB),
    keepExpiry: true,
  };
}

/**
 * ใบนี้ยังเปิดให้กด "ชำระอีกครั้ง" ได้อยู่ไหม
 *
 * นับจาก createdAt ของแถว payment ไม่ใช่จากเวลาที่ออก PaymentIntent ใบล่าสุด
 * เพราะการกดชำระซ้ำใช้แถวเดิม (reusePaymentId) หน้าต่างจึงต้องไม่ถูกรีเซ็ต
 * ทุกครั้งที่กด ไม่งั้นกดวนไปเรื่อยๆ ก็ไม่มีวันหมดอายุ
 */
export function isPaymentWindowOpen(createdAt: Date, now: Date = new Date()) {
  return (
    now.getTime() - createdAt.getTime() < PAYMENT_WINDOW_HOURS * MS_PER_HOUR
  );
}

/** เวลาที่ใบนี้จะหมดอายุ — ส่งให้หน้าเว็บนับถอยหลัง */
export function paymentExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PAYMENT_WINDOW_HOURS * MS_PER_HOUR);
}
