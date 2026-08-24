import { CurrentUser } from '@/common/decorator/current-user.decorator';
import { Roles } from '@/common/decorator/roles.decorator';
import { UserRole } from '@/database/generated/prisma/enums';
import { ChangePasswordDto } from '@/users/dto/change-password.dto';
import { CreateStaffDto } from '@/users/dto/create-staff.dto';
import { LinkOAuthDto } from '@/users/dto/link-oauth.dto';
import { SetPasswordDto } from '@/users/dto/set-password.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { UsersService } from '@/users/users.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ---- Profile (ตัวเอง) ----
  // route 'me' ต้องประกาศก่อน ':id' เสมอ ไม่งั้น Nest จะ match 'me' เป็น id

  @Get('me')
  async getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Roles(UserRole.SHOP_OWNER)
  @Patch('me')
  async updateMe(
    @CurrentUser('sub') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  // SRS §126 — พนักงานไม่มีสิทธิ์เปลี่ยนรหัสผ่านตนเอง ต้องให้เจ้าของร้านเปลี่ยนให้
  @Roles(UserRole.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @Patch('me/password')
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(userId, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  // SRS §99 — สิทธิ์ตั้ง password ครั้งแรกเป็นของเจ้าของร้านเท่านั้น
  @Roles(UserRole.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @Post('me/password/set')
  async setFirstPassword(
    @CurrentUser('sub') userId: string,
    @Body() setPasswordDto: SetPasswordDto,
  ) {
    await this.usersService.setFirstPassword(
      userId,
      setPasswordDto.newPassword,
    );
    return { message: 'Password set successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('me/link-line')
  async linkLine(
    @CurrentUser('sub') userId: string,
    @Body() linkOAuthDto: LinkOAuthDto,
  ) {
    await this.usersService.linkLine(userId, linkOAuthDto.code);
    return { message: 'LINE account linked successfully' };
  }

  @Roles(UserRole.SHOP_OWNER)
  @HttpCode(HttpStatus.OK)
  @Post('me/link-google')
  async linkGoogle(
    @CurrentUser('sub') userId: string,
    @Body() linkOAuthDto: LinkOAuthDto,
  ) {
    await this.usersService.linkGoogle(userId, linkOAuthDto.code);
    return { message: 'Google account linked successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Delete('me/unlink-line')
  async unlinkLine(@CurrentUser('sub') userId: string) {
    await this.usersService.unlinkLine(userId);
    return { message: 'LINE account unlinked successfully' };
  }

  // ---- Staff accounts (เจ้าของร้านเท่านั้น) ----

  @Roles(UserRole.SHOP_OWNER)
  @Post()
  async createStaffAccount(
    @CurrentUser('sub') ownerId: string,
    @Body() createStaffDto: CreateStaffDto,
  ) {
    return this.usersService.createStaff(ownerId, createStaffDto);
  }

  @Roles(UserRole.SHOP_OWNER)
  @Get(':id')
  async getStaffAccount(
    @CurrentUser('sub') ownerId: string,
    @Param('id', ParseUUIDPipe) staffId: string,
  ) {
    return this.usersService.getStaff(ownerId, staffId);
  }

  @Roles(UserRole.SHOP_OWNER)
  @Patch(':id')
  async updateStaffAccount(
    @CurrentUser('sub') ownerId: string,
    @Param('id', ParseUUIDPipe) staffId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateStaff(ownerId, staffId, updateUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SHOP_OWNER)
  @Delete(':id')
  async deleteStaffAccount(
    @CurrentUser('sub') ownerId: string,
    @Param('id', ParseUUIDPipe) staffId: string,
  ) {
    await this.usersService.deleteStaff(ownerId, staffId);
    return { message: 'Staff account deleted successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SHOP_OWNER)
  @Post(':id/reset-password')
  async resetStaffPassword(
    @CurrentUser('sub') ownerId: string,
    @Param('id', ParseUUIDPipe) staffId: string,
    @Body() setPasswordDto: SetPasswordDto,
  ) {
    await this.usersService.resetStaffPassword(
      ownerId,
      staffId,
      setPasswordDto.newPassword,
    );
    return { message: 'Staff password reset successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SHOP_OWNER)
  @Delete(':id/unlink-line')
  async unlinkStaffLine(
    @CurrentUser('sub') ownerId: string,
    @Param('id', ParseUUIDPipe) staffId: string,
  ) {
    await this.usersService.unlinkStaffLine(ownerId, staffId);
    return { message: 'Staff LINE account unlinked successfully' };
  }
}
