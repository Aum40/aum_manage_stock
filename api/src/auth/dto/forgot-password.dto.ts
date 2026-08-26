import { NormalizeEmail } from '@/common/decorator/normalize-email.decorator';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @NormalizeEmail()
  email: string;
}
