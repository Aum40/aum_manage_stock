import { Global, Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';
import { LineAuthService } from './line-auth.service';

/**
 * LINE/Google OAuth ถูกใช้ทั้งใน AuthModule (login) และ UsersModule (link บัญชี)
 * ถ้าปล่อยไว้ใน AuthModule แล้วให้ UsersModule import กลับ จะเกิด circular
 * dependency เพราะ AuthModule import UsersModule อยู่แล้ว
 */
@Global()
@Module({
  providers: [LineAuthService, GoogleAuthService],
  exports: [LineAuthService, GoogleAuthService],
})
export class OAuthModule {}
