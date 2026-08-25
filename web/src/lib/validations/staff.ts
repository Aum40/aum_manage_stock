import { z } from 'zod';

/**
 * ตรงกับ staffPermissionsSchema ฝั่ง api — ต้องส่งครบทุกฟิลด์ ไม่ใช่ partial
 * เพราะ PUT เป็นการเขียนทับทั้งชุด ไม่ใช่ patch ทีละอัน
 */
export const staffPermissionsSchema = z.object({
  canManageProduct: z.boolean(),
  canAdjustStockManual: z.boolean(),
  canUseChatbot: z.boolean(),
  canScanSale: z.boolean(),
  canViewDashboard: z.boolean(),
  canViewAiInsight: z.boolean(),
});

export const assignStaffSchema = z.object({
  shopId: z.string().uuid(),
});

/**
 * บัญชีพนักงานเจ้าของร้านเป็นคนสร้าง จึงมี username + password คู่กันเสมอ
 * และไม่มีอีเมล (api จึงไม่บังคับให้ยืนยันอีเมลก่อน login)
 */
export const createStaffSchema = z
  .object({
    firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ'),
    lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล'),
    username: z
      .string()
      .trim()
      .min(3, 'ชื่อผู้ใช้ต้องยาวอย่างน้อย 3 ตัวอักษร'),
    password: z.string().min(8, 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export type StaffPermissionsInput = z.infer<typeof staffPermissionsSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
