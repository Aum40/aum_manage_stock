import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';

import { OwnerId } from '../common/decorator/owner-id.decorator';
import {
  type StaffPermissionsDto,
  staffPermissionsSchema,
} from './dto/staff.dto';
import { StaffService } from './staff.service';

@Controller('shops/:shopId/staff')
export class ShopStaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  listShopStaff(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.staffService.listShopStaff(ownerId, shopId);
  }

  @Get(':staffId/permissions')
  getPermissions(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
  ) {
    return this.staffService.getPermissions(ownerId, shopId, staffId);
  }

  @Put(':staffId/permissions')
  setPermissions(
    @OwnerId() ownerId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('staffId', ParseUUIDPipe) staffId: string,
    @Body(new ZodValidationPipe(staffPermissionsSchema))
    dto: StaffPermissionsDto,
  ) {
    return this.staffService.setPermissions(ownerId, shopId, staffId, dto);
  }
}
