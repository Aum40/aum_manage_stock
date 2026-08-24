import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';

export class TwoFactorDisableDto {
  /**
   * SRS §112 กำหนดให้ยืนยันด้วยรหัส 6 หลักหรือ recovery code เท่านั้น
   * ไม่ได้พูดถึง password
   *
   * บัญชีที่สมัครด้วย LINE/Google ล้วนๆ ไม่มี password ตั้งแต่ต้น (SRS §89)
   * ถ้าบังคับช่องนี้ คนกลุ่มนั้นจะปิด 2FA เองไม่ได้เลยตลอดกาล
   * บัญชีที่ "มี" password อยู่แล้วยังต้องกรอกให้ถูก — บังคับที่ service
   */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;

  @ValidateIf((dto: TwoFactorDisableDto) => !dto.recoveryCode)
  @IsString()
  @Length(6, 6)
  otpCode?: string;

  @ValidateIf((dto: TwoFactorDisableDto) => !dto.otpCode)
  @IsString()
  @IsNotEmpty()
  recoveryCode?: string;
}
