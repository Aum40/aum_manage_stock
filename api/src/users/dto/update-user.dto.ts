import { Trim } from '@/common/decorator/trim.decorator';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(6, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'username ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง และขีดกลาง',
  })
  @Trim()
  username?: string;
}
