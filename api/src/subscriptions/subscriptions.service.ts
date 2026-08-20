import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { UpgradeSubscriptionDto } from './dto/subscription.dto';
import {
  addMonths,
  calculateShopQuota,
  isSubscriptionReadOnly,
} from './subscription-quota.util';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceThb: 'asc' },
    });
  }

  /** ใช้ร่วมกับ shops-resource เพื่อเช็ค quota/read-only ก่อนแก้ไขร้าน */
  async getSubscriptionWithPlanOrThrow(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this user');
    }

    return subscription;
  }

  async getMySubscriptionSummary(userId: string) {
    const subscription = await this.getSubscriptionWithPlanOrThrow(userId);
    const usedShopCount = await this.prisma.shop.count({
      where: { ownerId: userId, deletedAt: null },
    });

    const quota = calculateShopQuota({
      status: subscription.status,
      includedShopQuota: subscription.plan.includedShopQuota,
      usedShopCount,
    });

    const readOnly = isSubscriptionReadOnly({
      status: subscription.status,
      expiresAt: subscription.expiresAt,
    });

    return {
      subscription,
      readOnly,
      quotas: {
        shop: quota,
        // TODO(products-resource): เพิ่ม used count จริงเมื่อมีตาราง product
        // ตอนนี้คืนแค่ limit ของแพ็กเกจ (maxActiveProducts: null = ไม่จำกัด)
        product: { allowed: subscription.plan.maxActiveProducts },
        // TODO(staff-resource): เพิ่ม used count จริงเมื่อมีตาราง shop_staffs
        staff: { allowed: subscription.plan.includedStaffQuota },
      },
    };
  }

  async upgrade(userId: string, dto: UpgradeSubscriptionDto) {
    const subscription = await this.getSubscriptionWithPlanOrThrow(userId);

    const targetPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: dto.planCode },
    });

    if (!targetPlan || !targetPlan.isActive) {
      throw new NotFoundException('Plan not found');
    }

    if (targetPlan.isFree || targetPlan.durationMonths === null) {
      throw new BadRequestException('Cannot upgrade to this plan');
    }

    // แพ็กเกจแต่ละระดับมี quota ตายตัว ไม่มีการซื้อเพิ่มแยกต่างหากตาม SRS
    // ทางเดียวที่จะได้ quota มากขึ้นคืออัปเกรดไปแพ็กเกจที่ quota สูงกว่า
    // (รองรับทั้ง FREE->PLUS, FREE->PRO, และ PLUS->PRO)
    if (targetPlan.includedShopQuota <= subscription.plan.includedShopQuota) {
      throw new ConflictException(
        'This plan does not have a higher quota than your current plan. Use /subscriptions/renew to renew the same plan instead.',
      );
    }

    const startedAt = new Date();
    const expiresAt = addMonths(startedAt, targetPlan.durationMonths);

    // TODO(payments-resource): ตาม ER note ของ subscriptions ต้องสร้าง
    // payment record คู่กันในทรานแซกชันเดียวกับการอัปเดตนี้ (ทั้งกรณี
    // FREE->PAID และ PLUS->PRO) แต่ตาราง payments ยังไม่มีในระบบ (รอ
    // feature/payments-resource ของแพรว) — เมื่อ merge กันแล้วให้ห่อสองงาน
    // นี้ด้วย prisma.$transaction
    return this.prisma.subscription.update({
      where: { userId },
      data: {
        planId: targetPlan.id,
        status: 'ACTIVE',
        startedAt,
        expiresAt,
        expiryNotifiedAt: null,
      },
      include: { plan: true },
    });
  }

  async renew(userId: string) {
    const subscription = await this.getSubscriptionWithPlanOrThrow(userId);

    if (subscription.plan.isFree || subscription.plan.durationMonths === null) {
      throw new BadRequestException(
        'Free Plan never expires, so it cannot be renewed',
      );
    }

    const now = new Date();
    const base =
      subscription.expiresAt && subscription.expiresAt.getTime() > now.getTime()
        ? subscription.expiresAt
        : now;
    const expiresAt = addMonths(base, subscription.plan.durationMonths);

    // TODO(payments-resource): เช่นเดียวกับ upgrade() ต้องสร้าง payment record
    // (purpose = RENEWAL) คู่กันในทรานแซกชันเดียวกัน รอ feature/payments-resource
    return this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'ACTIVE',
        expiresAt,
        expiryNotifiedAt: null,
      },
      include: { plan: true },
    });
  }
}
