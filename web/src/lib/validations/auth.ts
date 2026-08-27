import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'กรุณากรอกอีเมลหรือชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
});

export type LoginValues = z.infer<typeof loginSchema>;

// สอดคล้องกับ @IsStrongPassword() ฝั่ง api (register.dto.ts)
export const passwordSchema = z
  .string()
  .min(8, 'อย่างน้อย 8 ตัวอักษร')
  .regex(/[a-z]/, 'ต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
  .regex(/[A-Z]/, 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
  .regex(/[0-9]/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว')
  .regex(/[^A-Za-z0-9]/, 'ต้องมีสัญลักษณ์พิเศษอย่างน้อย 1 ตัว');

export const registerSchema = z
  .object({
    firstName: z.string().min(1, 'กรุณากรอกชื่อ'),
    lastName: z.string().min(1, 'กรุณากรอกนามสกุล'),
    email: z.string().min(1, 'กรุณากรอกอีเมล').email('อีเมลไม่ถูกต้อง'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'กรุณากรอกอีเมล').email('อีเมลไม่ถูกต้อง'),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่าน'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
