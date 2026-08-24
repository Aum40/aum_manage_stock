import { Trim } from '@/common/decorator/trim.decorator';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** ใช้ทั้งระงับบัญชีผู้ใช้และระงับร้านค้า */
export class SuspendDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  @Trim()
  reason: string;
}
