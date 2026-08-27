import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';

import { CurrentUser } from '../common/decorator/current-user.decorator';
import { OwnerId } from '../common/decorator/owner-id.decorator';
import { Roles } from '../common/decorator/roles.decorator';
import { UserRole } from '../database/generated/prisma/enums';
import {
  type CreateShopDto,
  createShopSchema,
  type UpdateShopDto,
  updateShopSchema,
} from './dto/shop.dto';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  create(
    @OwnerId() ownerId: string,
    @Body(new ZodValidationPipe(createShopSchema)) dto: CreateShopDto,
  ) {
    return this.shopsService.create(ownerId, dto);
  }

  @Get()
  list(@OwnerId() ownerId: string) {
    return this.shopsService.list(ownerId);
  }

  @Get(':id')
  getById(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.getById(ownerId, id);
  }

  @Patch(':id')
  update(
    @OwnerId() ownerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateShopSchema)) dto: UpdateShopDto,
  ) {
    return this.shopsService.update(ownerId, id, dto);
  }

  @Delete(':id')
  remove(@OwnerId() ownerId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.shopsService.remove(ownerId, id);
  }

  @Patch(':id/pause')
  @Roles(UserRole.SHOP_OWNER)
  pause(
    @OwnerId() ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shopsService.pause(ownerId, role, id);
  }

  @Patch(':id/resume')
  @Roles(UserRole.SHOP_OWNER)
  resume(
    @OwnerId() ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shopsService.resume(ownerId, role, id);
  }
}
