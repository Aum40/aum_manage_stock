import { z } from 'zod';

import { passwordSchema } from '@/lib/validations/auth';

/** ตรงกับ UpdateUserDto ฝั่ง api — username อนุญาตเฉพาะ a-z 0-9 . _ - */
export const profileSchema = z.object({
  firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
  lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
  username: z
    .string()
    .min(3, 'อย่างน้อย 3 ตัวอักษร')
    .max(50, 'ยาวได้ไม่เกิน 50 ตัวอักษร')
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง และขีดกลาง',
    )
    .or(z.literal('')),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านเดิม'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่านใหม่'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/**
 * บัญชีที่สมัครผ่าน LINE/Google ยังไม่มี password (SRS §89) จึงไม่มีรหัสผ่านเดิมให้กรอก
 * ใช้กับ POST /users/me/password/set แทน
 */
export const setPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่านใหม่'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
