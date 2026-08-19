import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get('me')
  getMe() {}

  @Patch('me')
  updateMe() {}

  @Patch('me/password')
  changePassword() {}

  @Post('me/password/set')
  setFirstPassword() {}

  @Post('me/link-line')
  linkLine() {}

  @Post('me/link-google')
  linkGoogle() {}

  @Delete('me/unlink-line')
  unlinkLine() {}

  @Post('')
  createStaffAccount() {}

  @Get(':id')
  getStaffAccount() {}

  @Patch(':id')
  updateStaffAccount() {}

  @Delete(':id')
  deleteStaffAccount() {}

  @Post(':id/reset-password')
  resetStaffPassword() {}

  @Delete(':id/unlink-line')
  unlinkStaffLine() {}
}
