import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountContextService,
  type AccountContext,
} from '@/common/access/account-context.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AiAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountContext: AccountContextService,
  ) {}

  /**
   * ตรวจสิทธิ์สองชั้นตาม AGENTS.md
   * 1) staff_permissions.can_view_ai_insight ของพนักงานในร้านนั้น
   * 2) subscription_plans.ai_recommendation_enabled ของเจ้าของร้าน (Pro เท่านั้น)
   *
   * ผ่านชั้นเดียวถือว่าเป็นบั๊ก — เจ้าของร้านเปิดสิทธิ์ให้พนักงานบนแพ็กเกจ Plus ได้
   * แต่ชั้นแพ็กเกจต้องบล็อกอยู่ดี (SRS §179, §181 — AI Recommendations เป็น Pro เท่านั้น)
   */
  async assertCanViewAi(
    userId: string,
    shopId: string,
  ): Promise<AccountContext> {
    const ctx = await this.accountContext.resolve(userId);
    await this.assertShopBelongsToOwner(ctx.ownerId, shopId);

    if (ctx.isStaff) {
      const assignment = await this.assertAssignedToShop(ctx.userId, shopId);

      if (!assignment.permission?.canViewAiInsight) {
        throw new ForbiddenException({
          message: 'คุณไม่มีสิทธิ์ดูคำแนะนำจาก AI ของร้านนี้',
          code: 'AI_PERMISSION_DENIED',
        });
      }
    }

    await this.assertPlanAllowsAi(ctx.ownerId);

    return ctx;
  }

  /** การสั่งสร้างใหม่เป็นการเขียนข้อมูล จึงต้องบล็อกตอนแพ็กเกจหมดอายุด้วย */
  async assertCanGenerateAi(
    userId: string,
    shopId: string,
  ): Promise<AccountContext> {
    const ctx = await this.assertCanViewAi(userId, shopId);
    await this.accountContext.assertNotReadOnly(ctx.ownerId);

    return ctx;
  }

  private async assertPlanAllowsAi(ownerId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: { select: { aiRecommendationEnabled: true } } },
    });

    if (!subscription?.plan.aiRecommendationEnabled) {
      throw new ForbiddenException({
        message: 'คำแนะนำจาก AI ใช้ได้เฉพาะแพ็กเกจ Pro กรุณาอัปเกรดแพ็กเกจ',
        code: 'AI_NOT_IN_PLAN',
      });
    }
  }

  // ร้านของคนอื่นคืน 404 ไม่ใช่ 403 เพื่อไม่บอกใบ้ว่า shopId นั้นมีอยู่จริง
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
      select: { id: true, permission: { select: { canViewAiInsight: true } } },
    });

    if (!assignment) throw new NotFoundException('ไม่พบร้านค้านี้');

    return assignment;
  }
}
