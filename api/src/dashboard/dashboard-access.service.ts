import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AccountContextService,
  type AccountContext,
} from '../common/access/account-context.service';
import {
  SHOP_ACCESS_PROVIDER,
  type ShopAccessProvider,
} from '../common/shop-access/shop-access.port';

@Injectable()
export class DashboardAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountContext: AccountContextService,
    @Inject(SHOP_ACCESS_PROVIDER)
    private readonly shopAccess: ShopAccessProvider,
  ) {}

  async assertCanViewShopDashboard(
    userId: string,
    shopId: string,
  ): Promise<AccountContext> {
    const ctx = await this.shopAccess.assertCanViewShopProducts(userId, shopId);
    await this.assertDashboardPermission(ctx, shopId);
    return ctx;
  }

  async assertCanViewAccountDashboard(userId: string): Promise<AccountContext> {
    const ctx = await this.accountContext.resolve(userId);
    await this.assertDashboardPermission(ctx);
    return ctx;
  }

  async assertPaidPlan(ownerId: string, requiredPlan = 'PLUS'): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: { select: { isFree: true } } },
    });

    if (!subscription || subscription.plan.isFree) {
      throw new ForbiddenException({
        message:
          'รายงานนี้ใช้ได้เมื่ออัปเกรดเป็นแพ็กเกจ Plus หรือ Pro เท่านั้น',
        code: 'PLAN_UPGRADE_REQUIRED',
        requiredPlan,
      });
    }
  }

  async listVisibleShopIds(ctx: AccountContext): Promise<string[]> {
    if (ctx.isStaff) {
      const assignments = await this.prisma.shopStaff.findMany({
        where: {
          userId: ctx.userId,
          removedAt: null,
          shop: { ownerId: ctx.ownerId, deletedAt: null, status: 'ACTIVE' },
          permission: { canViewDashboard: true },
        },
        select: { shopId: true },
      });
      return assignments.map((assignment) => assignment.shopId);
    }

    const shops = await this.prisma.shop.findMany({
      where: { ownerId: ctx.ownerId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });
    return shops.map((shop) => shop.id);
  }

  private async assertDashboardPermission(
    ctx: AccountContext,
    shopId?: string,
  ): Promise<void> {
    if (!ctx.isStaff) return;

    const granted = await this.prisma.shopStaff.findFirst({
      where: {
        userId: ctx.userId,
        removedAt: null,
        ...(shopId ? { shopId } : {}),
        shop: { ownerId: ctx.ownerId, deletedAt: null },
        permission: { canViewDashboard: true },
      },
      select: { id: true },
    });

    if (!granted) {
      throw new ForbiddenException({
        message: 'คุณไม่มีสิทธิ์ดูแดชบอร์ด',
        code: 'DASHBOARD_PERMISSION_DENIED',
      });
    }
  }
}
