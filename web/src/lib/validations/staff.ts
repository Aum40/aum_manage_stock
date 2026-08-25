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
 * กติกาเดียวกับ @IsStrongPassword ของ api (SetPasswordDto / CreateStaffDto)
 * เช็คซ้ำฝั่งเว็บเพื่อให้ผู้ใช้เห็น error ทันทีโดยไม่ต้องรอ 400 กลับมา
 */
const strongPassword = z
  .string()
  .min(8, 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร')
  .regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
  .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
  .regex(/[0-9]/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว')
  .regex(/[^a-zA-Z0-9]/, 'ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว');

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
      .min(3, 'ชื่อผู้ใช้ต้องยาวอย่างน้อย 3 ตัวอักษร')
      .max(50, 'ชื่อผู้ใช้ยาวเกิน 50 ตัวอักษร')
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        'ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง และขีดกลาง',
      ),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
    path: ['confirmPassword'],
  });

/**
 * api ไม่ได้สุ่มรหัสใหม่ให้ — เจ้าของร้านเป็นคนตั้งเอง แล้ว api จะเตะ session
 * ของพนักงานคนนั้นทิ้งทั้งหมด จึงต้องมีฟอร์มให้กรอก ไม่ใช่กดปุ่มแล้วจบ
 */
export const resetStaffPasswordSchema = z
  .object({
    newPassword: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export type StaffPermissionsInput = z.infer<typeof staffPermissionsSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type ResetStaffPasswordInput = z.infer<typeof resetStaffPasswordSchema>;
