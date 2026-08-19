import { RegisterDto } from '@/auth/dto/register.dto';
import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('register')
  register(@Body() registerDto: RegisterDto) {}

  @Post('login')
  login() {}

  @Get('line/callback')
  lineCallback() {}

  @Get('google/callback')
  googleCallback() {}

  @Post('refresh')
  refresh() {}

  @Post('logout')
  logout() {}

  @Post('forgot-password')
  forgotPassword() {}

  @Post('reset-password')
  resetPassword() {}

  @Post('2fa/enable')
  enable2fa() {}

  @Post('2fa/verify')
  verify2fa() {}

  @Post('2fa/disable')
  disable2fa() {}

  @Post('2fa/recovery')
  useRecoveryCode() {}
}
