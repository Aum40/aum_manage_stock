import { AccessTokenService } from '@/auth/access-token.service';
import { LoginDto } from '@/auth/dto/login.dto';
import { RegisterDto } from '@/auth/dto/register.dto';
import { GoogleAuthService } from '@/infrastructure/oauth/google-auth.service';
import { LineAuthService } from '@/infrastructure/oauth/line-auth.service';
import { RefreshTokenService } from '@/auth/refresh-token.service';
import { UserRole } from '@/database/generated/prisma/enums';
import { User } from '@/database/generated/prisma/client';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { UsersService } from '@/users/users.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '@/config/env.validation';
import { PasswordResetTokenService } from '@/auth/password-reset-token.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { EncryptionService } from '@/infrastructure/encryption/encryption.service';
import { TwoFactorChallengeService } from '@/auth/two-factor-challenge.service';
import { TwoFactorRecoveryCodeService } from '@/auth/two-factor-recovery-code.service';
import { EmailVerificationTokenService } from '@/auth/email-verification-token.service';
import { TwoFactorDisableDto } from '@/auth/dto/two-factor-disable.dto';
import { generateSecret, generateURI, verify as verifyOtp } from 'otplib';
import * as QRCode from 'qrcode';

/**
 * otplib ตั้ง epochTolerance = 0 มาเป็นค่า default คือไม่เผื่อนาฬิกาคลาดเลย
 * ในทางปฏิบัติมือถือที่เวลาเพี้ยนไม่กี่วินาที หรือผู้ใช้กดยืนยันตอนรหัสกำลัง
 * จะหมดอายุพอดี จะใส่รหัสไม่ผ่านทั้งที่รหัสถูก — เผื่อไว้ 1 ช่วงเวลา (±30 วิ)
 * ตามที่ RFC 6238 §5.2 แนะนำให้ยอมรับ transmission delay ได้
 */
const TOTP_EPOCH_TOLERANCE_SECONDS = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UsersService,
    private readonly bcryptService: BcryptService,
    private readonly accessTokenService: AccessTokenService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly lineAuthService: LineAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly passwordResetTokenService: PasswordResetTokenService,
    private readonly mailService: MailService,
    private readonly encryptionService: EncryptionService,
    private readonly twoFactorChallengeService: TwoFactorChallengeService,
    private readonly recoveryCodeService: TwoFactorRecoveryCodeService,
    private readonly emailVerificationTokenService: EmailVerificationTokenService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.userService.createUser({
      ...dto,
      role: UserRole.SHOP_OWNER,
    });
    await this.sendVerificationEmail(user.id, dto.email);
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findByIdentifier(dto.identifier);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await this.bcryptService.compare(
      dto.password,
      user.password,
    );

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // บัญชีที่มีอีเมลแต่ยังไม่ยืนยัน ห้าม login ด้วยรหัสผ่าน
    // (บัญชีพนักงานที่ไม่มีอีเมลไม่โดนกฎนี้ เพราะไม่มีอะไรให้ยืนยัน)
    if (user.email && !user.emailVerifiedAt) {
      throw new ForbiddenException('Email not verified');
    }

    return this.completeLogin(user);
  }

  /**
   * OAuth callback รับที่ route handler ฝั่ง web (ไม่ใช่ที่ api) แล้ว web ค่อย
   * ส่ง code ต่อมาให้ api แลก token — ดังนั้น redirect_uri ที่ใช้แลก token
   * ต้องเป็น URL ของ web และต้องตรงเป๊ะกับที่ oauth-buttons.tsx ส่งตอน authorize
   */
  private get webCallbackBaseUrl(): string {
    return this.configService
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/$/, '');
  }

  async loginWithLine(code: string) {
    const profile = await this.lineAuthService.exchangeCodeForProfile(
      code,
      `${this.webCallbackBaseUrl}/api/auth/line/callback`,
    );

    let user = await this.userService.findByLineId(profile.lineUserId);
    if (!user) {
      user = await this.userService.createLineUser({
        lineUserId: profile.lineUserId,
        displayName: profile.displayName,
      });
    }

    return this.completeLogin(user);
  }

  async loginWithGoogle(code: string) {
    const profile = await this.googleAuthService.exchangeCodeForProfile(
      code,
      `${this.webCallbackBaseUrl}/api/auth/google/callback`,
    );

    let user = await this.userService.findByGoogleId(profile.googleId);
    if (!user) {
      user = await this.userService.createGoogleUser({
        googleId: profile.googleId,
        displayName: profile.displayName,
        email: profile.email,
      });
    } else if (!user.username) {
      user =
        (await this.userService.ensureUsername(
          user.id,
          profile.email ?? profile.displayName,
        )) ?? user;
    }

    return this.completeLogin(user);
  }

  async refresh(rawRefreshToken: string) {
    const record = await this.refreshTokenService.findValid(rawRefreshToken);

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.usedAt) {
      await this.refreshTokenService.revokeFamily(record.familyId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (record.user.deletedAt || record.user.status !== 'ACTIVE') {
      await this.refreshTokenService.revokeFamily(record.familyId);
      throw new ForbiddenException('Your account has been suspended');
    }

    await this.refreshTokenService.markUsed(record.id);

    const accessToken = await this.accessTokenService.sign({
      sub: record.user.id,
      role: record.user.role,
      ownerId: record.user.ownerId,
    });

    const refreshToken = await this.refreshTokenService.issue(
      record.user.id,
      record.familyId,
    );

    return { accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string) {
    await this.refreshTokenService.revokeByToken(rawRefreshToken);
  }

  async forgotPassword(email: string) {
    const user = await this.userService.findByEmailForReset(email);
    if (!user) {
      return;
    }
    const token = await this.passwordResetTokenService.issue(user.id);
    try {
      await this.mailService.sendPasswordResetEmail(email, token);
    } catch (error) {
      this.logger.error(`Failed to send reset email to ${email}`, error);
    }
  }

  /**
   * บัญชีถูกสร้าง/token ถูกออกไปแล้วก่อนถึงขั้นส่งเมล ถ้า SMTP ล้มแล้วปล่อยให้
   * throw ผู้ใช้จะเห็น 500 ทั้งที่สมัครสำเร็จ จึงกลืน error ไว้แล้ว log แทน
   * ผู้ใช้ขอลิงก์ใหม่ได้ที่ POST /auth/resend-verification
   */
  private async sendVerificationEmail(userId: string, email: string) {
    const token = await this.emailVerificationTokenService.issue(userId);
    try {
      await this.mailService.sendEmailVerification(email, token);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
    }
  }

  async verifyEmail(token: string) {
    const record = await this.emailVerificationTokenService.findValid(token);

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.emailVerificationTokenService.markUsed(record.id);
    if (record.pendingEmail) {
      await this.userService.completeEmailChange(
        record.userId,
        record.pendingEmail,
      );
    } else {
      await this.userService.markEmailVerified(record.userId);
    }
  }

  /** ตอบ 200 เสมอไม่ว่าอีเมลจะมีจริงไหม กันการไล่เดาว่าอีเมลไหนสมัครไว้แล้ว */
  async resendVerificationEmail(email: string) {
    const user = await this.userService.findUnverifiedByEmail(email);
    if (!user?.email) {
      return;
    }
    await this.sendVerificationEmail(user.id, user.email);
  }

  async requestEmailChange(
    userId: string,
    email: string,
    currentPassword: string,
  ) {
    const user = await this.userService.findById(userId);
    if (!user?.password) {
      throw new BadRequestException(
        'Set a password before changing your email',
      );
    }
    const passwordMatches = await this.bcryptService.compare(
      currentPassword,
      user.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const normalized = email.trim().toLowerCase();
    const existing = await this.userService.findByIdentifier(normalized);
    if (existing && existing.id !== userId) {
      throw new ConflictException('Email already registered');
    }

    const token = await this.emailVerificationTokenService.issue(
      userId,
      normalized,
    );
    try {
      await this.mailService.sendEmailChangeVerification(normalized, token);
    } catch (error) {
      this.logger.error(
        `Failed to send email change verification to ${normalized}`,
        error,
      );
      throw new BadRequestException('Could not send email verification');
    }
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.passwordResetTokenService.findValid(token);

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    await this.passwordResetTokenService.markUsed(record.id);
    await this.userService.updatePassword(record.userId, newPassword);
    await this.refreshTokenService.revokeAllForUser(record.userId);
  }

  async enable2fa(userId: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'Aum Manage Stocks',
      label: user.email ?? user.id,
      secret,
    });

    // เก็บ secret ไว้ก่อนแต่ยัง "ไม่เปิด" 2FA — ต้องยืนยันรหัส 6 หลักที่
    // POST /auth/2fa/confirm ก่อน ไม่งั้นผู้ใช้ที่สแกน QR พลาดจะล็อกตัวเองออก
    await this.userService.setTwoFactorSecret(
      userId,
      this.encryptionService.encrypt(secret),
    );

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { qrCodeDataUrl, secret };
  }

  /**
   * SRS §40 — recovery codes ออกให้ "ตอนเปิดใช้งาน 2FA สำเร็จ"
   * จึงสร้างที่ขั้นยืนยัน ไม่ใช่ตอนขอ QR
   */
  async confirm2fa(userId: string, otpCode: string) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.twoFactorEnabled) {
      throw new ConflictException('2FA is already enabled');
    }
    if (!user.twoFactorSecretEnc) {
      throw new BadRequestException(
        'Start with POST /auth/2fa/enable to get a QR code first',
      );
    }
    if (!(await this.verifyTotp(user, otpCode))) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    await this.userService.enableTwoFactor(userId);
    const recoveryCodes = await this.recoveryCodeService.generate(userId);

    return { recoveryCodes };
  }

  /**
   * SRS §112 — ปิด 2FA ต้องยืนยันด้วยรหัส 6 หลักหรือ recovery code
   *
   * password ไม่ใช่เงื่อนไขตาม SRS และบัญชีที่สมัครด้วย LINE/Google ล้วนๆ
   * ก็ไม่มี password ให้กรอกตั้งแต่ต้น (SRS §89) ถ้าบังคับ คนกลุ่มนี้จะเปิด
   * 2FA แล้วปิดเองไม่ได้เลย ต้องให้แอดมินแก้ใน DB ให้ ซึ่งแย่กว่าเดิม
   *
   * ความปลอดภัยไม่ได้ลดลง: ผู้เรียกต้องถือ access token อยู่แล้ว (ผ่าน
   * LINE/Google login มา = ปัจจัยที่หนึ่ง) บวกกับ OTP หรือ recovery code
   * (= ปัจจัยที่สอง) ครบสองชั้นตามนิยาม ส่วนบัญชีที่มี password ก็ยังต้อง
   * กรอกให้ถูกเหมือนเดิม
   */
  async disable2fa(userId: string, dto: TwoFactorDisableDto) {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.password) {
      const isPasswordValid =
        !!dto.password &&
        (await this.bcryptService.compare(dto.password, user.password));
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    if (dto.otpCode) {
      if (!(await this.verifyTotp(user, dto.otpCode))) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    } else if (dto.recoveryCode) {
      const record = await this.recoveryCodeService.findValid(
        userId,
        dto.recoveryCode,
      );
      if (!record) {
        throw new UnauthorizedException('Invalid recovery code');
      }
    } else {
      // DTO บังคับให้ส่งมาอย่างน้อยหนึ่งอย่างอยู่แล้ว แต่ถ้าใครแก้ DTO ทีหลัง
      // เคสนี้จะปิด 2FA ได้โดยไม่ยืนยันอะไรเลย จึงกันไว้ที่นี่ด้วย
      throw new UnauthorizedException('Provide either otpCode or recoveryCode');
    }

    await this.userService.disableTwoFactor(userId);
    await this.recoveryCodeService.revokeAllForUser(userId);
  }

  async verifyTwoFactorLogin(challengeToken: string, code: string) {
    const payload = await this.resolveChallenge(challengeToken);
    const user = await this.userService.findById(payload.sub);

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('Invalid challenge');
    }

    if (!(await this.verifyTotp(user, code))) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    return this.issueTokensForUser(user);
  }

  async loginWithRecoveryCode(challengeToken: string, recoveryCode: string) {
    const payload = await this.resolveChallenge(challengeToken);
    const user = await this.userService.findById(payload.sub);

    if (!user || !user.twoFactorEnabled) {
      throw new UnauthorizedException('Invalid challenge');
    }

    const record = await this.recoveryCodeService.findValid(
      user.id,
      recoveryCode,
    );
    if (!record) {
      throw new UnauthorizedException('Invalid recovery code');
    }
    await this.recoveryCodeService.markUsed(record.id);

    return this.issueTokensForUser(user);
  }

  private async resolveChallenge(challengeToken: string) {
    try {
      return await this.twoFactorChallengeService.verify(challengeToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired challenge token');
    }
  }

  private async verifyTotp(user: User, code: string): Promise<boolean> {
    if (!user.twoFactorSecretEnc) {
      return false;
    }
    const secret = this.encryptionService.decrypt(user.twoFactorSecretEnc);
    const result = await verifyOtp({
      secret,
      token: code,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS,
    });
    return result.valid;
  }

  /**
   * ปลายทางร่วมของ "ทุก" ช่องทาง login — email/username, LINE และ Google
   *
   * SRS §111 บังคับว่าบัญชีที่เปิด 2FA ต้องกรอกรหัส 6 หลักเพิ่มหลัง login สำเร็จ
   * ไม่ว่าจะเข้ามาทางไหน ห้ามมีช่องทางไหนข้ามด่านนี้เด็ดขาด ไม่งั้น 2FA แทบไม่มี
   * ความหมาย เพราะคนที่ยึดบัญชี LINE/Google ได้ก็แค่เลือกทางที่ไม่มีด่าน
   *
   * ทุกช่องทางจึงต้องเรียกเมธอดนี้ ห้ามเรียก issueTokensForUser() ตรงๆ
   * (ยกเว้นหลังผ่าน 2FA แล้ว ซึ่งผ่านด่านมาเรียบร้อยจึงเรียกได้)
   */
  private async completeLogin(user: User) {
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Your account has been suspended');
    }

    if (user.twoFactorEnabled) {
      const challengeToken = await this.twoFactorChallengeService.sign(user.id);
      return { requires2fa: true, challengeToken };
    }

    return this.issueTokensForUser(user);
  }

  private async issueTokensForUser(user: User) {
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Your account has been suspended');
    }

    const accessToken = await this.accessTokenService.sign({
      sub: user.id,
      role: user.role,
      ownerId: user.ownerId,
    });
    const refreshToken = await this.refreshTokenService.issue(user.id);

    // จุดเดียวที่ทุกช่องทาง login วิ่งผ่านแน่นอน (รวมทั้งหลังผ่าน 2FA/recovery
    // code) จึงเป็นที่ที่ถูกต้องสำหรับบันทึกเวลาเข้าใช้งานล่าสุด — แอดมินใช้ดู
    // ว่าบัญชีไหนไม่ได้ใช้งานนานแล้วก่อนตัดสินใจระงับ
    await this.userService.markLoggedIn(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.userService.sanitize(user),
    };
  }
}
