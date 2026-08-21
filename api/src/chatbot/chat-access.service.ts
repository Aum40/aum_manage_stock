import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountContextService,
  type AccountContext,
} from '../common/access/account-context.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ChatAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountContext: AccountContextService,
  ) {}

  async assertCanViewChat(
    userId: string,
    shopId: string,
  ): Promise<AccountContext> {
    const ctx = await this.accountContext.resolve(userId);
    await this.assertShopBelongsToOwner(ctx.ownerId, shopId);

    if (ctx.isStaff) await this.assertAssignedToShop(ctx.userId, shopId);

    return ctx;
  }

  async assertCanUseChatbot(
    userId: string,
    shopId: string,
  ): Promise<AccountContext> {
    const ctx = await this.accountContext.resolve(userId);
    await this.assertShopBelongsToOwner(ctx.ownerId, shopId);

    if (ctx.isStaff) {
      const assignment = await this.assertAssignedToShop(ctx.userId, shopId);

      if (!assignment.permission?.canUseChatbot) {
        throw new ForbiddenException({
          message: 'คุณไม่มีสิทธิ์ใช้แชทบอทของร้านนี้',
          code: 'CHATBOT_PERMISSION_DENIED',
        });
      }
    }

    await this.assertPlanAllowsChatbot(ctx.ownerId);
    await this.accountContext.assertNotReadOnly(ctx.ownerId);

    return ctx;
  }

  private async assertPlanAllowsChatbot(ownerId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: { select: { chatbotEnabled: true } } },
    });

    if (!subscription?.plan.chatbotEnabled) {
      throw new ForbiddenException({
        message:
          'แพ็กเกจปัจจุบันใช้แชทบอทไม่ได้ กรุณาอัปเกรดเป็น Plus หรือ Pro',
        code: 'CHATBOT_NOT_IN_PLAN',
      });
    }
  }

  private async assertShopBelongsToOwner(
    ownerId: string,
    shopId: string,
  ): Promise<void> {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, ownerId, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!shop) throw new NotFoundException('ไม่พบร้านค้านี้');

    if (shop.status !== 'ACTIVE') {
      throw new ForbiddenException({
        message: 'ร้านค้านี้ถูกระงับการใช้งาน',
        code: 'SHOP_SUSPENDED',
      });
    }
  }

  private async assertAssignedToShop(userId: string, shopId: string) {
    const assignment = await this.prisma.shopStaff.findFirst({
      where: { userId, shopId, removedAt: null },
      select: { id: true, permission: { select: { canUseChatbot: true } } },
    });

    if (!assignment) throw new NotFoundException('ไม่พบร้านค้านี้');

    return assignment;
  }
}
