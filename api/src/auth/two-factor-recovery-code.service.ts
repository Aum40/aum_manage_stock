import { PrismaService } from '@/database/prisma.service';
import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

const RECOVERY_CODE_COUNT = 10;

@Injectable()
export class TwoFactorRecoveryCodeService {
  constructor(private readonly prisma: PrismaService) {}

  hash(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async generate(userId: string): Promise<string[]> {
    await this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } });

    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      crypto.randomBytes(5).toString('hex'),
    );

    await this.prisma.twoFactorRecoveryCode.createMany({
      data: codes.map((code) => ({ userId, codeHash: this.hash(code) })),
    });

    return codes;
  }

  findValid(userId: string, rawCode: string) {
    return this.prisma.twoFactorRecoveryCode.findFirst({
      where: { userId, codeHash: this.hash(rawCode), usedAt: null },
    });
  }

  async markUsed(id: string) {
    await this.prisma.twoFactorRecoveryCode.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } });
  }
}
