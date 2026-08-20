export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface ShopQuotaInput {
  status: SubscriptionStatus;
  includedShopQuota: number;
  usedShopCount: number;
}

export interface ShopQuotaResult {
  allowed: number;
  used: number;
  remaining: number;
  canCreateShop: boolean;
}

/**
 * allowed = plan.included_shop_quota (จำนวนตายตัวตามแพ็กเกจ ไม่มีการซื้อ
 * เพิ่มแยกต่างหากตาม SRS — ต้องอัปเกรดแพ็กเกจเท่านั้นถึงจะได้ quota เพิ่ม)
 * used = COUNT(shops WHERE owner_id = user_id AND deleted_at IS NULL)
 * สร้างร้านใหม่ได้เมื่อ status = ACTIVE AND used < allowed
 */
export function calculateShopQuota(input: ShopQuotaInput): ShopQuotaResult {
  const allowed = input.includedShopQuota;
  const remaining = allowed - input.usedShopCount;

  return {
    allowed,
    used: input.usedShopCount,
    remaining,
    canCreateShop: input.status === 'ACTIVE' && remaining > 0,
  };
}

export interface ReadOnlyCheckInput {
  status: SubscriptionStatus;
  expiresAt: Date | null;
  now?: Date;
}

/**
 * read-only mode ไม่มีคอลัมน์เก็บ คำนวณจาก status/expires_at เท่านั้น
 * Free Plan (expires_at = NULL) ไม่มีวันเข้า read-only ไม่ว่า status จะเป็นอะไร
 * expires_at ที่ผ่านมาแล้วถือเป็นหมดอายุทันทีแม้ status ยังไม่ถูกอัปเดตโดย cron
 */
export function isSubscriptionReadOnly(input: ReadOnlyCheckInput): boolean {
  if (input.expiresAt === null) return false;
  if (input.status === 'CANCELLED') return true;

  const now = input.now ?? new Date();
  return input.expiresAt.getTime() <= now.getTime();
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
