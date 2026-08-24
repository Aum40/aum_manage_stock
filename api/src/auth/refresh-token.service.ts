import { EnvVariable } from '@/config/env.validation';
import { PrismaService } from '@/database/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  hash(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async issue(userId: string, familyId?: string): Promise<string> {
    const raw = crypto.randomBytes(48).toString('hex');
    const expiresInSec = this.configService.get('REFRESH_TOKEN_EXPIRES_IN', {
      infer: true,
    });

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(raw),
        familyId: familyId ?? crypto.randomUUID(),
        expiresAt: new Date(Date.now() + expiresInSec * 1000),
      },
    });

    return raw;
  }

  findValid(rawToken: string) {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      include: { user: true },
    });
  }

  async markUsed(id: string) {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { usedAt: new Date(), revokedAt: new Date() },
    });
  }

  async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.logger.warn(`Refresh token family ${familyId} revoked`);
  }

  async revokeByToken(rawToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
