import { IsIn } from 'class-validator';

/**
 * SRS §66/§110 — ไม่มีการซื้อ quota เพิ่มแยกต่างหาก และไม่มี downgrade
 * จ่ายได้เฉพาะแพ็กเกจแบบเสียเงินเท่านั้น
 */
export const PAID_PLAN_CODES = ['PLUS', 'PRO'] as const;
export type PaidPlanCode = (typeof PAID_PLAN_CODES)[number];

export class CreateSubscriptionPaymentDto {
  @IsIn(PAID_PLAN_CODES, {
    message: 'planCode ต้องเป็น PLUS หรือ PRO เท่านั้น',
  })
  planCode: PaidPlanCode;
}
