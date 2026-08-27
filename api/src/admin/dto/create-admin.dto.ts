import { NormalizeEmail } from '@/common/decorator/normalize-email.decorator';
import { Trim } from '@/common/decorator/trim.decorator';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
} from 'class-validator';

/**
 * SRS §29/§186 — Super Admin เท่านั้นที่เพิ่มบัญชีผู้ดูแลระบบได้
 *
 * ตั้งใจไม่ให้เลือก role ตรงนี้ — บัญชีใหม่เป็น ADMIN เสมอ ถ้าจะเลื่อนเป็น
 * Super Admin ให้ไปใช้ PATCH /admin/admins/:id/role ซึ่งเป็นการกระทำคนละอย่าง
 * และถูกบันทึกลงประวัติแยกกัน
 */
export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @NormalizeEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;
}
