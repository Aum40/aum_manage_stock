import { UserRole } from '@/database/generated/prisma/enums';
import { IsIn } from 'class-validator';

/** SRS §29/§186 — Super Admin เท่านั้นที่จัดการสิทธิ์ของ Admin คนอื่นได้ */
export type AdminRole = typeof UserRole.ADMIN | typeof UserRole.SUPER_ADMIN;

export class UpdateAdminRoleDto {
  @IsIn([UserRole.ADMIN, UserRole.SUPER_ADMIN], {
    message: 'role ต้องเป็น ADMIN หรือ SUPER_ADMIN เท่านั้น',
  })
  role: AdminRole;
}
