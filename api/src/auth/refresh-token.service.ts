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

  /**
   * ตั้งแค่ usedAt เท่านั้น — ห้ามตั้ง revokedAt ด้วย
   *
   * สองคอลัมน์นี้คนละความหมายกัน usedAt = "ใบนี้ถูกหมุนไปเป็นใบใหม่แล้ว"
   * ส่วน revokedAt = "ใบนี้ถูกยกเลิก (logout / เพิกถอนทั้ง family)" ถ้าตั้ง
   * revokedAt ตอนหมุนด้วย จะแยกสองกรณีนี้ไม่ออก แล้ว AuthService.refresh()
   * จะเผื่อช่วง grace ให้ request ที่ตามมาทีหลังไม่ได้ (ดูคอมเมนต์ที่นั่น)
   * และ revokeFamily() ก็จะข้ามใบที่ถูกหมุนแล้วไป เพราะมันกรอง revokedAt: null
   */
  async markUsed(id: string) {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { usedAt: new Date() },
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
