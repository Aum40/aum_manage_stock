import { NormalizeEmail } from '@/common/decorator/normalize-email.decorator';
import { Trim } from '@/common/decorator/trim.decorator';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class RegisterDto {
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
