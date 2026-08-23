import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';

/** ใช้ทั้ง setFirstPassword และ resetStaffPassword — ทั้งคู่ตั้งรหัสใหม่โดยไม่ต้องรู้รหัสเดิม */
export class SetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  newPassword: string;
}
