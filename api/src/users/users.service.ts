import { AccountContextService } from '@/common/access/account-context.service';
import { EnvVariable } from '@/config/env.validation';
import { PrismaService } from '@/database/prisma.service';
import { User } from '@/database/generated/prisma/client';
import { UserRole } from '@/database/generated/prisma/enums';
import { BcryptService } from '@/infrastructure/hash/bcrypt.service';
import { GoogleAuthService } from '@/infrastructure/oauth/google-auth.service';
import { LineAuthService } from '@/infrastructure/oauth/line-auth.service';
import { ChangePasswordDto } from '@/users/dto/change-password.dto';
import { CreateStaffDto } from '@/users/dto/create-staff.dto';
import { UpdateUserDto } from '@/users/dto/update-user.dto';
import { UserCreateInput } from '@/users/types/user.type';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import * as crypto from 'node:crypto';

/** username เป็น VarChar(50) เว้นที่ไว้ 5 ตัวให้เลขสุ่มต่อท้าย */
const USERNAME_BASE_MAX_LENGTH = 45;
const USERNAME_ATTEMPT_LIMIT = 5;

/** ต้อง seed ก่อนด้วย prisma/sql/003_seed_subscription_plans.sql */
const FREE_PLAN_CODE = 'FREE';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly lineAuthService: LineAuthService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly configService: ConfigService<EnvVariable, true>,
    private readonly accountContext: AccountContextService,
  ) {}

  /**
   * SRS §34/§83 — บัญชีที่สมัครด้วยอีเมลต้องมี username เสมอ ระบบสร้างให้เอง
   * จาก local-part ของอีเมล ถ้าซ้ำให้สุ่มเลขต่อท้ายจนกว่าจะได้ที่ไม่ซ้ำ
   */
  async createUser(input: UserCreateInput) {
    const hash = await this.bcryptService.hash(input.password);

    for (let attempt = 0; attempt < USERNAME_ATTEMPT_LIMIT; attempt++) {
      const username =
        input.username ??
        (input.email
          ? await this.generateUsernameFromEmail(input.email, attempt)
          : undefined);

      try {
        return await this.prisma.user.create({
          data: {
            ...input,
            username,
            password: hash,
            // เจ้าของร้านใหม่ต้องได้ Free Plan ทันที ไม่งั้นทุก endpoint ที่
            // เช็ค quota จะ 404 เพราะหา subscription ไม่เจอ
            ...(input.role === UserRole.SHOP_OWNER
              ? {
                  subscription: {
                    create: {
                      plan: { connect: { code: FREE_PLAN_CODE } },
                      startedAt: new Date(),
                      // Free Plan ไม่มีวันหมดอายุ (SRS §57)
                      expiresAt: null,
                    },
                  },
                }
              : {}),
          },
        });
      } catch (error) {
        const duplicated = this.duplicatedFields(error);
        if (!duplicated) {
          throw error;
        }

        // Prisma คืน meta.target เป็นชื่อ constraint (users_email_key) ไม่ใช่
        // ชื่อคอลัมน์ จึงต้องเทียบแบบ substring ไม่ใช่เทียบตรงตัว
        const conflictsWith = (field: string) =>
          duplicated.some((target) => target.includes(field));

        if (
          conflictsWith('email') ||
          (!conflictsWith('username') &&
            input.email &&
            (await this.isEmailTaken(input.email)))
        ) {
          throw new ConflictException('Email already registered');
        }
        // username ที่ผู้ใช้ส่งมาเองชนกัน = แจ้งเลย ไม่ต้องสุ่มใหม่ให้
        if (input.username) {
          throw new ConflictException('Username already taken');
        }
        // username ที่ระบบสุ่มเองชนกัน = วนสุ่มใหม่
      }
    }

    throw new ConflictException(
      'Could not generate an available username, please try again',
    );
  }

  findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmailForReset(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        role: { not: 'SHOP_STAFF' },
        deletedAt: null,
      },
    });
  }

  findByLineId(lineUserId: string) {
    return this.prisma.user.findFirst({
      where: { lineUserId, deletedAt: null },
    });
  }

  createLineUser(input: { lineUserId: string; displayName: string }) {
    return this.prisma.user.create({
      data: {
        firstName: input.displayName,
        lastName: '-',
        lineUserId: input.lineUserId,
        role: 'SHOP_OWNER',
      },
    });
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findFirst({
      where: { googleId, deletedAt: null },
    });
  }

  /**
   * SRS §85 — สมัครด้วย Google ต้องบันทึก email จาก Google ทันที
   * และถือว่ายืนยันอีเมลแล้ว เพราะ Google ยืนยันให้ (เช็ค email_verified มาแล้ว)
   */
  createGoogleUser(input: {
    googleId: string;
    displayName: string;
    email: string | null;
  }) {
    return this.prisma.user.create({
      data: {
        firstName: input.displayName,
        lastName: '-',
        googleId: input.googleId,
        email: input.email?.toLowerCase() ?? null,
        emailVerifiedAt: input.email ? new Date() : null,
        role: 'SHOP_OWNER',
      },
    });
  }

  /** เรียกจาก AuthService ทุกครั้งที่ออก token สำเร็จ (ทุกช่องทาง login) */
  async markLoggedIn(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  async markEmailVerified(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  /** หา user ที่มีอีเมลนี้และยังไม่ยืนยัน — ใช้ตอนขอส่งลิงก์ยืนยันใหม่ */
  findUnverifiedByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        emailVerifiedAt: null,
        deletedAt: null,
      },
    });
  }

  async updatePassword(userId: string, newPassword: string) {
    const hash = await this.bcryptService.hash(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitize(user);
  }

  /**
   * ตัด password/secret ออกเสมอ แต่บอกกลับไปว่า "ตั้งรหัสผ่านไว้หรือยัง"
   * เพราะหน้าเว็บต้องรู้ว่าจะให้ตั้งรหัสครั้งแรก (ไม่ต้องยืนยันรหัสเดิม)
   * หรือให้เปลี่ยนรหัส (ต้องยืนยันรหัสเดิม) — ดูจาก field อื่นแทนไม่ได้
   */
  sanitize(
    user: User,
  ): Omit<User, 'password' | 'twoFactorSecretEnc'> & { hasPassword: boolean } {
    const { password, twoFactorSecretEnc, ...rest } = user;
    return { ...rest, hasPassword: password !== null };
  }

  /** เก็บ secret อย่างเดียว ยังไม่เปิด 2FA — เปิดจริงที่ enableTwoFactor() */
  async setTwoFactorSecret(userId: string, encryptedSecret: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecretEnc: encryptedSecret },
    });
  }

  async enableTwoFactor(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  async disableTwoFactor(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecretEnc: null, twoFactorEnabled: false },
    });
  }

  // =====================================================================
  // Profile (ตัวเอง)
  // =====================================================================

  async updateProfile(userId: string, dto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: dto,
      });
      return this.sanitize(user);
    } catch (error) {
      throw this.toConflictIfDuplicate(error, 'Username already taken');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) {
      throw new BadRequestException(
        'Account has no password set — use POST /users/me/password/set',
      );
    }

    const isMatch = await this.bcryptService.compare(
      dto.oldPassword,
      user.password,
    );
    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.updatePassword(userId, dto.newPassword);
    await this.revokeSessions(userId);
  }

  async setFirstPassword(userId: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.password) {
      throw new ConflictException(
        'Password already set — use PATCH /users/me/password',
      );
    }

    await this.updatePassword(userId, newPassword);
  }

  async linkLine(userId: string, code: string) {
    const profile = await this.lineAuthService.exchangeCodeForProfile(
      code,
      `${this.frontendUrl}/api/users/link-line/callback`,
    );
    await this.linkOAuthId(userId, { lineUserId: profile.lineUserId }, 'LINE');
  }

  async linkGoogle(userId: string, code: string) {
    const profile = await this.googleAuthService.exchangeCodeForProfile(
      code,
      `${this.frontendUrl}/api/users/link-google/callback`,
    );

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // SRS §96 — บัญชีที่ยังไม่มี email ให้ดึงจาก Google มาบันทึกให้อัตโนมัติ
    // SRS §122 — email ที่บันทึกแล้วห้ามแก้ไข จึงเซ็ตเฉพาะตอนยังว่างเท่านั้น
    const data: { googleId: string; email?: string; emailVerifiedAt?: Date } = {
      googleId: profile.googleId,
    };
    if (!user.email && profile.email) {
      data.email = profile.email.toLowerCase();
      // Google ยืนยันอีเมลให้แล้ว ไม่ต้องให้ผู้ใช้ยืนยันซ้ำ
      data.emailVerifiedAt = new Date();
    }

    await this.linkOAuthId(userId, data, 'Google');
  }

  async unlinkLine(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.lineUserId) {
      throw new BadRequestException('No LINE account is linked');
    }
    // กันผู้ใช้ตัดช่องทางเข้าระบบช่องทางสุดท้ายของตัวเองทิ้ง
    if (!user.password && !user.googleId) {
      throw new BadRequestException(
        'Cannot unlink your only sign-in method — set a password first',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { lineUserId: null },
    });
  }

  // =====================================================================
  // Staff accounts (เจ้าของร้านจัดการพนักงานของตัวเอง)
  // =====================================================================

  async createStaff(ownerId: string, dto: CreateStaffDto) {
    await this.assertStaffQuotaAvailable(ownerId);

    const hash = await this.bcryptService.hash(dto.password);
    try {
      const staff = await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          username: dto.username,
          password: hash,
          role: UserRole.SHOP_STAFF,
          ownerId,
        },
      });
      return this.sanitize(staff);
    } catch (error) {
      throw this.toConflictIfDuplicate(error, 'Username already taken');
    }
  }

  async getStaff(ownerId: string, staffId: string) {
    const staff = await this.findOwnedStaff(ownerId, staffId);
    return this.sanitize(staff);
  }

  async updateStaff(ownerId: string, staffId: string, dto: UpdateUserDto) {
    await this.findOwnedStaff(ownerId, staffId);
    return this.updateProfile(staffId, dto);
  }

  async deleteStaff(ownerId: string, staffId: string) {
    const staff = await this.findOwnedStaff(ownerId, staffId);

    // soft delete — staff quota คืนอัตโนมัติเพราะ quota นับจาก deletedAt IS NULL
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: staff.id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: staff.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async resetStaffPassword(
    ownerId: string,
    staffId: string,
    newPassword: string,
  ) {
    const staff = await this.findOwnedStaff(ownerId, staffId);
    await this.updatePassword(staff.id, newPassword);
    await this.revokeSessions(staff.id);
  }

  async unlinkStaffLine(ownerId: string, staffId: string) {
    const staff = await this.findOwnedStaff(ownerId, staffId);
    if (!staff.lineUserId) {
      throw new BadRequestException('No LINE account is linked');
    }

    await this.prisma.user.update({
      where: { id: staff.id },
      data: { lineUserId: null },
    });
  }

  // =====================================================================
  // helpers
  // =====================================================================

  private get frontendUrl(): string {
    return this.configService
      .get('FRONTEND_URL', { infer: true })
      .replace(/\/$/, '');
  }

  private async findOwnedStaff(ownerId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        ownerId,
        role: UserRole.SHOP_STAFF,
        deletedAt: null,
      },
    });

    if (!staff) {
      throw new NotFoundException('Staff account not found');
    }
    return staff;
  }

  private async linkOAuthId(
    userId: string,
    data: {
      lineUserId?: string;
      googleId?: string;
      email?: string;
      emailVerifiedAt?: Date;
    },
    provider: string,
  ) {
    try {
      await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      throw this.toConflictIfDuplicate(
        error,
        `This ${provider} account is already linked to another user`,
      );
    }
  }

  private async revokeSessions(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * ครั้งแรกลอง local-part ตรงๆ ก่อน ครั้งถัดไปต่อเลขสุ่มเสมอ
   * (เช็คซ้ำตรงนี้เป็นแค่การเดาที่ดี — ตัวตัดสินจริงคือ unique constraint ใน DB
   * ที่ createUser จับ P2002 แล้ววนใหม่ จึงกัน race condition ได้ด้วย)
   */
  private async generateUsernameFromEmail(
    email: string,
    attempt: number,
  ): Promise<string> {
    const base = this.toUsernameBase(email);

    if (attempt === 0 && !(await this.isUsernameTaken(base))) {
      return base;
    }
    return `${base}${crypto.randomInt(1000, 10000)}`;
  }

  private toUsernameBase(email: string): string {
    const localPart = email.split('@')[0] ?? '';
    const cleaned = localPart.toLowerCase().replace(/[^a-z0-9._-]/g, '');
    // DTO บังคับ username ยาวอย่างน้อย 3 ตัว อีเมลอย่าง a@x.com จึงต้องเติมหน้า
    const safe = cleaned.length >= 3 ? cleaned : `user${cleaned}`;
    return safe.slice(0, USERNAME_BASE_MAX_LENGTH);
  }

  private async isUsernameTaken(username: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({ where: { username } });
    return found !== null;
  }

  private async isEmailTaken(email: string): Promise<boolean> {
    const found = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return found !== null;
  }

  /** คืนรายชื่อคอลัมน์ที่ชน unique constraint หรือ null ถ้าไม่ใช่ error แบบนั้น */
  private duplicatedFields(error: unknown): string[] | null {
    if (
      !(error instanceof PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return null;
    }
    const target = error.meta?.target;
    if (Array.isArray(target)) {
      return target.map(String);
    }
    return typeof target === 'string' ? [target] : [];
  }

  private toConflictIfDuplicate(error: unknown, message: string): unknown {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(message);
    }
    return error;
  }

  /**
   * staff quota นับระดับบัญชีเจ้าของร้าน ไม่ใช่รายร้าน (ดู AGENTS.md)
   * TODO(subscriptions): ย้ายไปเรียก SubscriptionsService เมื่อ
   * feature/subscriptions-resource เปิด API ให้ใช้ข้ามโมดูลได้
   */
  private async assertStaffQuotaAvailable(ownerId: string) {
    // SRS §123 — แพ็กเกจหมดอายุแล้วต้องเป็น read-only สร้างอะไรใหม่ไม่ได้
    //
    // เช็ค status !== 'ACTIVE' อย่างเดียวไม่พอ เพราะไม่มี cron ที่คอยพลิก
    // status เป็น EXPIRED ให้ แถวที่ expires_at เลยมาแล้วจึงยังเป็น ACTIVE อยู่
    // read-only เป็นสถานะที่คำนวณจาก status/expires_at เสมอ (ดู AGENTS.md)
    await this.accountContext.assertNotReadOnly(ownerId);

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: ownerId },
      include: { plan: true },
    });

    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException('No active subscription');
    }

    const used = await this.prisma.user.count({
      where: { ownerId, role: UserRole.SHOP_STAFF, deletedAt: null },
    });

    if (used >= subscription.plan.includedStaffQuota) {
      throw new ForbiddenException(
        `Staff quota reached (${used}/${subscription.plan.includedStaffQuota}) — upgrade your plan to add more staff`,
      );
    }
  }
}
