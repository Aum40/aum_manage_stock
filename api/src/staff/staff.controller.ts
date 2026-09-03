import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';

import { OwnerId } from '../common/decorator/owner-id.decorator';
import { assignStaffSchema, type AssignStaffDto } from './dto/staff.dto';
import { StaffService } from './staff.service';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  listAll(@OwnerId() ownerId: string) {
    return this.staffService.listAll(ownerId);
  }

  @Get('quota')
  getQuota(@OwnerId() ownerId: string) {
    return this.staffService.getQuota(ownerId);
  }

  @Get(':id')
  getDetail(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.staffService.getDetail(ownerId, id);
  }

  @Post(':id/assign')
  assign(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(assignStaffSchema)) dto: AssignStaffDto,
  ) {
    return this.staffService.assign(ownerId, id, dto);
  }

  /**
   * คืน 200 พร้อม message ไม่ใช่ 204 — ให้ตรงกับ DELETE ตัวอื่นของโปรเจกต์
   * (users.controller.ts ก็ใช้ @HttpCode(OK) + { message } เหมือนกัน)
   *
   * และ 204 ใช้กับ proxy กลางของเว็บไม่ได้ เพราะ forwardAuthed() ใน
   * web/src/lib/api-forward.ts ปิดท้ายด้วย NextResponse.json(data, { status })
   * เสมอ ซึ่ง 204 มี body ไม่ได้ → กลายเป็น 500 ทุกครั้งที่เรียกผ่านหน้าเว็บ
   */
  @Delete(':id/assign/:shopId')
  @HttpCode(HttpStatus.OK)
  async unassign(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    await this.staffService.unassign(ownerId, id, shopId);
    return { message: 'Staff unassigned from the shop successfully' };
  }

  @Get(':id/shops')
  getShops(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.getShops(ownerId, id);
  }
}
