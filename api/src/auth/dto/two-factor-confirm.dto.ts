import { IsNotEmpty, IsString, Length } from 'class-validator';

/** ยืนยันรหัส 6 หลักครั้งแรกก่อนเปิดใช้งาน 2FA จริง */
export class TwoFactorConfirmDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otpCode: string;
}
