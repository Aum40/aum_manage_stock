import { NormalizeEmail } from '@/common/decorator/normalize-email.decorator';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @NormalizeEmail()
  email: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}
