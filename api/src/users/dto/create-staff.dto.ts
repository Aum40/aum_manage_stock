import { Trim } from '@/common/decorator/trim.decorator';
import {
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Length,
  Matches,
} from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  lastName: string;

  @IsString()
  @Length(6, 50)
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'username ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง และขีดกลาง',
  })
  @Trim()
  username: string;

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
