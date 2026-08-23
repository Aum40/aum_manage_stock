import { Trim } from '@/common/decorator/trim.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
