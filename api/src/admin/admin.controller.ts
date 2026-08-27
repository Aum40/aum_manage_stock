import { AdminService } from '@/admin/admin.service';
import {
  ListShopsQueryDto,
  ListUsersQueryDto,
} from '@/admin/dto/list-query.dto';
import { CreateAdminDto } from '@/admin/dto/create-admin.dto';
import { SuspendDto } from '@/admin/dto/suspend.dto';
import { UpdateAdminRoleDto } from '@/admin/dto/update-admin-role.dto';
import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { UserRole } from '@/database/generated/prisma/enums';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

/** SRS §28 — Admin ตรวจสอบและระงับบัญชี/ร้านค้าได้
 *  SRS §29/§186 — Super Admin ทำได้ทุกอย่างที่ Admin ทำได้ บวกจัดการสิทธิ์ Admin */
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ---- ผู้ใช้ ----

  @Get('users')
  async listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Patch('users/:id/suspend')
  async suspendUser(
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() suspendDto: SuspendDto,
  ) {
    return this.adminService.suspendUser(actorId, id, suspendDto.reason);
  }

  @Patch('users/:id/reactivate')
  async reactivateUser(
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.reactivateUser(actorId, id);
  }

  // ---- สิทธิ์ Admin (Super Admin เท่านั้น) ----

  @Roles(UserRole.SUPER_ADMIN)
  @Post('admins')
  async createAdmin(
    @CurrentUser('sub') actorId: string,
    @Body() createAdminDto: CreateAdminDto,
  ) {
    return this.adminService.createAdmin(actorId, createAdminDto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch('admins/:id/role')
  async updateAdminRole(
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdminRoleDto: UpdateAdminRoleDto,
  ) {
    return this.adminService.updateAdminRole(
      actorId,
      id,
      updateAdminRoleDto.role,
    );
  }

  // ---- ร้านค้า ----

  @Get('shops')
  async listShops(@Query() query: ListShopsQueryDto) {
    return this.adminService.listShops(query);
  }

  @Patch('shops/:id/suspend')
  async suspendShop(
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() suspendDto: SuspendDto,
  ) {
    return this.adminService.suspendShop(actorId, id, suspendDto.reason);
  }

  @Patch('shops/:id/reactivate')
  async reactivateShop(
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.reactivateShop(actorId, id);
  }

  // ---- ภาพรวมระบบ ----

  @Get('overview')
  async getOverview() {
    return this.adminService.getOverview();
  }
}
