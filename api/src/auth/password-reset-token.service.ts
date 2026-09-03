import { EnvVariable } from '@/config/env.validation';
import { PrismaService } from '@/database/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class PasswordResetTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  hash(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async issue(userId: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    const expiresInSec = this.configService.get('RESET_TOKEN_EXPIRES_IN', {
      infer: true,
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + expiresInSec * 1000),
      },
    });

    return raw;
  }

  findValid(rawToken: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: { tokenHash: this.hash(rawToken), usedAt: null },
      include: { user: true },
    });
  }

  async markUsed(id: string) {
    await this.prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
