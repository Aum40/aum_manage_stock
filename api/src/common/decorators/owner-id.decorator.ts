import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ดึง id ของเจ้าของร้านที่เป็นเจ้าของข้อมูล
 *
 * TODO(auth): ตอนนี้อ่านจาก header `x-user-id` ชั่วคราว เพราะ feature/auth-resource
 * ยังไม่ merge เข้ามา เมื่อ JWT guard พร้อมแล้วให้เปลี่ยนไส้ในของไฟล์นี้ให้อ่านจาก
 * `request.user` แทน โดย controller/service ไม่ต้องแก้เลย
 *
 * หมายเหตุ: ถ้าผู้เรียกเป็นพนักงาน ต้อง resolve ต่อเป็น `users.owner_id` ของพนักงานคนนั้น
 * เพราะหมวดหมู่ผูกกับเจ้าของร้าน ไม่ได้ผูกกับผู้สร้าง
 */
export const OwnerId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const ownerId = request.headers['x-user-id'];

    if (typeof ownerId !== 'string' || !UUID_PATTERN.test(ownerId)) {
      throw new BadRequestException(
        'ต้องส่ง header "x-user-id" เป็น UUID (ใช้ชั่วคราวจนกว่าระบบ auth จะพร้อม)',
      );
    }

    return ownerId;
  },
);
