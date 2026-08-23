import { UserRole } from '@/database/generated/prisma/enums';
import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * คืน id ของ "เจ้าของร้าน" ที่เป็นเจ้าของข้อมูลที่กำลังถูกเรียก
 *
 * เดิมอ่านจาก header `x-user-id` ชั่วคราวระหว่างรอ feature/auth-resource
 * ตอนนี้ AuthGuard ใส่ request.user ให้แล้ว จึงสลับมาอ่านจาก JWT ตามที่
 * TODO เดิมวางไว้ — controller และ service ที่ใช้ @OwnerId() ไม่ต้องแก้เลย
 *
 * พนักงาน resolve เป็น users.owner_id เพราะข้อมูลเป็นของเจ้าของร้าน
 * ไม่ใช่ของคนที่สร้าง
 */
export const OwnerId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new InternalServerErrorException(
        '@OwnerId() ต้องใช้ภายใต้ AuthGuard เท่านั้น',
      );
    }

    // แอดมินไม่มีร้านเป็นของตัวเอง ถ้าปล่อยผ่านจะได้ id ของแอดมินไปใช้เป็น
    // ownerId แล้ว query ได้ผลว่างเปล่าแบบเงียบๆ ซึ่ง debug ยากกว่าปฏิเสธตรงๆ
    // งานฝั่งผู้ดูแลระบบให้ใช้ /admin/* แทน
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'บัญชีผู้ดูแลระบบไม่มีร้านค้าเป็นของตนเอง กรุณาใช้ /admin/* แทน',
      );
    }

    if (user.role === UserRole.SHOP_STAFF) {
      if (!user.ownerId) {
        // ตาม schema พนักงานต้องมี owner_id เสมอ ไม่มี = ข้อมูลผิดปกติ
        throw new InternalServerErrorException(
          'บัญชีพนักงานไม่มี ownerId ผูกไว้',
        );
      }
      return user.ownerId;
    }

    return user.sub;
  },
);
