import { Trim } from '@/common/decorator/trim.decorator';
import {
  IsAlphanumeric,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
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
  @Trim()
  email: string;

  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  @IsAlphanumeric()
  password: string;
}
