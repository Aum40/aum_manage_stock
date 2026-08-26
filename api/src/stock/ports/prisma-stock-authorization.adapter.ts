import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client';
import { isSubscriptionReadOnly } from '../../subscriptions/subscription-quota.util';
import { StockAuthorizationPort } from './stock-authorization.port';

@Injectable()
export class PrismaStockAuthorizationAdapter implements StockAuthorizationPort {
  async assertCanViewStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; actorId: string },
  ): Promise<void> {
    const shop = await tx.shop.findFirst({
      where: { id: input.shopId, deletedAt: null, status: 'ACTIVE' },
      select: { ownerId: true },
    });
    if (!shop) throw new NotFoundException('Active shop not found');
    if (shop.ownerId === input.actorId) return;

    const assignment = await tx.shopStaff.findFirst({
      where: {
        shopId: input.shopId,
        userId: input.actorId,
        removedAt: null,
        user: { status: 'ACTIVE', deletedAt: null },
      },
      select: { id: true },
    });
    if (!assignment)
      throw new ForbiddenException('Stock history access is not permitted');
  }

  async assertCanAdjustStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; actorId: string },
  ): Promise<void> {
    const shop = await tx.shop.findFirst({
      where: { id: input.shopId, deletedAt: null, status: 'ACTIVE' },
      select: {
        ownerId: true,
        owner: {
          select: {
            subscription: { select: { status: true, expiresAt: true } },
          },
        },
      },
    });
    if (!shop) throw new NotFoundException('Active shop not found');
    const subscription = shop.owner.subscription;
    if (!subscription || isSubscriptionReadOnly(subscription))
      throw new ForbiddenException('Subscription is read-only');
    if (shop.ownerId === input.actorId) return;

    const assignment = await tx.shopStaff.findFirst({
      where: {
        shopId: input.shopId,
        userId: input.actorId,
        removedAt: null,
        user: { status: 'ACTIVE', deletedAt: null },
        permission: { canAdjustStockManual: true },
      },
      select: { id: true },
    });
    if (!assignment)
      throw new ForbiddenException('Manual stock adjustment is not permitted');
  }

  async assertCanUseChatbot(
    tx: Prisma.TransactionClient,
    input: { shopId: string; actorId: string },
  ): Promise<void> {
    const shop = await tx.shop.findFirst({
      where: { id: input.shopId, deletedAt: null, status: 'ACTIVE' },
      select: {
        ownerId: true,
        owner: {
          select: {
            subscription: {
              select: {
                status: true,
                expiresAt: true,
                plan: { select: { chatbotEnabled: true } },
              },
            },
          },
        },
      },
    });
    if (!shop) throw new NotFoundException('Active shop not found');
    const subscription = shop.owner.subscription;
    if (
      !subscription ||
      isSubscriptionReadOnly(subscription) ||
      !subscription.plan.chatbotEnabled
    ) {
      throw new ForbiddenException('Subscription does not include chatbot');
    }
    if (shop.ownerId === input.actorId) return;

    const assignment = await tx.shopStaff.findFirst({
      where: {
        shopId: input.shopId,
        userId: input.actorId,
        removedAt: null,
        user: { status: 'ACTIVE', deletedAt: null },
        permission: { canUseChatbot: true },
      },
      select: { id: true },
    });
    if (!assignment)
      throw new ForbiddenException('Chatbot access is not permitted');
  }
}
