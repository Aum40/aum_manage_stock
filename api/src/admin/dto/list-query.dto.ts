import { Trim } from '@/common/decorator/trim.decorator';
import {
  UserRole,
  UserStatus,
  ShopStatus,
} from '@/database/generated/prisma/enums';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** ใช้รูปแบบเดียวกับ ListProductQuery ของโมดูลอื่น: page/limit + meta ในผลลัพธ์ */
class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  /** ค้นจากชื่อ นามสกุล อีเมล หรือ username */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Trim()
  q?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

export class ListShopsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Trim()
  q?: string;

  @IsOptional()
  @IsEnum(ShopStatus)
  status?: ShopStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
