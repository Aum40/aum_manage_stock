import { Trim } from '@/common/decorator/trim.decorator';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @Trim()
  email: string;
}
