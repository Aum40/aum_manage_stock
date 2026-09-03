import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '@/users/users.module';
import { AccessTokenService } from './access-token.service';
import { RefreshTokenService } from './refresh-token.service';
import { PasswordResetTokenService } from './password-reset-token.service';
import { MailModule } from '@/infrastructure/mail/mail.module';
import { TwoFactorRecoveryCodeService } from './two-factor-recovery-code.service';
import { TwoFactorChallengeService } from './two-factor-challenge.service';
import { EmailVerificationTokenService } from './email-verification-token.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenService,
    RefreshTokenService,
    PasswordResetTokenService,
    TwoFactorRecoveryCodeService,
    TwoFactorChallengeService,
    EmailVerificationTokenService,
  ],
  imports: [UsersModule, MailModule],
  exports: [AccessTokenService, RefreshTokenService],
})
export class AuthModule {}
