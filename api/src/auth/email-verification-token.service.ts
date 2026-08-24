import { EnvVariable } from '@/config/env.validation';
import { PrismaService } from '@/database/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class EmailVerificationTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  hash(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /** ออกลิงก์ใหม่ = ยกเลิกลิงก์เก่าที่ยังไม่ถูกใช้ทั้งหมดของ user คนนั้น */
  async issue(userId: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    const expiresInSec = this.configService.get(
      'EMAIL_VERIFICATION_TOKEN_EXPIRES_IN',
      { infer: true },
    );

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId, usedAt: null },
      }),
      this.prisma.emailVerificationToken.create({
        data: {
          userId,
          tokenHash: this.hash(raw),
          expiresAt: new Date(Date.now() + expiresInSec * 1000),
        },
      }),
    ]);

    return raw;
  }

  findValid(rawToken: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash: this.hash(rawToken), usedAt: null },
      include: { user: true },
    });
  }

  async markUsed(id: string) {
    await this.prisma.emailVerificationToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
