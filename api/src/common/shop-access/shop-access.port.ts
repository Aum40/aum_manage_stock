import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AccountContextService,
  type AccountContext,
} from '../access/account-context.service';

export const SHOP_ACCESS_PROVIDER = Symbol('SHOP_ACCESS_PROVIDER');

export interface ShopAccessProvider {
  assertCanViewShopProducts(
    userId: string,
    shopId: string,
  ): Promise<AccountContext>;

  assertCanManageShopProducts(
    userId: string,
    shopId: string,
  ): Promise<AccountContext>;
}

@Injectable()
export class PrismaShopAccessAdapter implements ShopAccessProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountContext: AccountContextService,
  ) {}

  async assertCanViewShopProducts(
    userId: string,
    shopId: string,
  ): Promise<AccountContext> {
    const ctx = await this.accountContext.resolve(userId);
    await this.assertShopBelongsToOwner(ctx.ownerId, shopId);

    if (ctx.isStaff) await this.assertAssignedToShop(ctx.userId, shopId);

    return ctx;
  }

  async assertCanManageShopProducts(
    userId: string,
    shopId: string,
  ): Promise<AccountContext> {
    const ctx = await this.accountContext.resolve(userId);
    await this.assertShopBelongsToOwner(ctx.ownerId, shopId);

    if (ctx.isStaff) {
      const assignment = await this.assertAssignedToShop(ctx.userId, shopId);

      if (!assignment.permission?.canManageProduct) {
        throw new ForbiddenException({
          message: 'คุณไม่มีสิทธิ์จัดการสินค้าของร้านนี้',
          code: 'PRODUCT_PERMISSION_DENIED',
        });
      }
    }

    await this.accountContext.assertNotReadOnly(ctx.ownerId);

    return ctx;
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
      select: { id: true, permission: { select: { canManageProduct: true } } },
    });

    if (!assignment) {
      throw new NotFoundException('ไม่พบร้านค้านี้');
    }

    return assignment;
  }
}
