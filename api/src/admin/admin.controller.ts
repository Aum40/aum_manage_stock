import { Controller, Get, Patch } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Patch('users/:id/suspend')
  suspendUser() {}

  @Patch('users/:id/reactivate')
  reactivateUser() {}

  @Get('users')
  listUsers() {}

  @Patch('admins/:id/role')
  updateAdminRole() {}
}
