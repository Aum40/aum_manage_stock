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

import { OwnerId } from '../common/decorators/owner-id.decorator';
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
  getDetail(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
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

  @Delete(':id/assign/:shopId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unassign(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.staffService.unassign(ownerId, id, shopId);
  }

  @Get(':id/shops')
  getShops(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.staffService.getShops(ownerId, id);
  }
}
