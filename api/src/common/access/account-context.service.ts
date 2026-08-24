import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { isSubscriptionReadOnly } from '../../subscriptions/subscription-quota.util';

export interface AccountContext {
  userId: string;
  ownerId: string;
  isStaff: boolean;
}

@Injectable()
export class AccountContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(userId: string): Promise<AccountContext> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, ownerId: true, status: true },
    });

    if (!user) throw new NotFoundException('ไม่พบบัญชีผู้ใช้นี้');

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        message: 'บัญชีนี้ถูกระงับการใช้งาน',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    return {
      userId: user.id,
      ownerId: user.ownerId ?? user.id,
      isStaff: user.ownerId !== null,
    };
  }

  async assertNotReadOnly(ownerId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { status: true, expiresAt: true },
    });

    if (!subscription) return;

    const readOnly =
      subscription.status === 'EXPIRED' ||
      isSubscriptionReadOnly({
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      });

    if (readOnly) {
      throw new ForbiddenException({
        message:
          'แพ็กเกจหมดอายุแล้ว ร้านค้าอยู่ในโหมดอ่านอย่างเดียว กรุณาต่ออายุสมาชิกเพื่อแก้ไขข้อมูล',
        code: 'SUBSCRIPTION_READ_ONLY',
      });
    }
  }

  async assertCanManageCatalog(ctx: AccountContext): Promise<void> {
    if (ctx.isStaff) {
      const granted = await this.prisma.shopStaff.findFirst({
        where: {
          userId: ctx.userId,
          removedAt: null,
          shop: { ownerId: ctx.ownerId, deletedAt: null },
          permission: { canManageProduct: true },
        },
        select: { id: true },
      });

      if (!granted) {
        throw new ForbiddenException({
          message: 'คุณไม่มีสิทธิ์จัดการสินค้า',
          code: 'PRODUCT_PERMISSION_DENIED',
        });
      }
    }

    await this.assertNotReadOnly(ctx.ownerId);
  }
}
