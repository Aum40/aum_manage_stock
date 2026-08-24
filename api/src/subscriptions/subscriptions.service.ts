import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../database/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
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

    const usedProductCount = await this.prisma.product.count({
      where: { ownerId: userId, deletedAt: null },
    });

    // นับพนักงานแบบ distinct ตาม userId ไม่ใช่นับแถว shop_staffs ตรงๆ
    // เพราะพนักงานคนเดียวมอบหมายหลายร้านของเจ้าของเดียวกันนับแค่ 1
    // (staff_quota นับที่ระดับบัญชี ไม่ใช่ต่อร้าน)
    const staffRows = await this.prisma.shopStaff.groupBy({
      by: ['userId'],
      where: { removedAt: null, shop: { ownerId: userId, deletedAt: null } },
    });
    const usedStaffCount = staffRows.length;

    const maxActiveProducts = subscription.plan.maxActiveProducts;
    const includedStaffQuota = subscription.plan.includedStaffQuota;

    return {
      subscription,
      readOnly,
      quotas: {
        shop: quota,
        product: {
          allowed: maxActiveProducts,
          used: usedProductCount,
          remaining:
            maxActiveProducts === null
              ? null
              : maxActiveProducts - usedProductCount,
        },
        staff: {
          allowed: includedStaffQuota,
          used: usedStaffCount,
          remaining: includedStaffQuota - usedStaffCount,
        },
      },
    };
  }

  /**
   * เปลี่ยนแพ็กเกจจริง — เรียกได้เฉพาะหลังยืนยันการชำระเงินแล้วเท่านั้น
   * (PaymentsService.handleWebhook) ไม่มี HTTP endpoint ตรงมาถึงเมธอดนี้
   * ไม่งั้นจะอัปเกรดได้ฟรีโดยไม่ต้องจ่าย
   *
   * รับ tx เข้ามาเพื่อให้ commit พร้อมกับการปิดยอดชำระในทรานแซกชันเดียว
   * ตามที่ ER note ของ subscriptions กำหนดไว้
   */
  async applyUpgrade(
    userId: string,
    planCode: string,
    tx: Prisma.TransactionClient,
  ) {
    const subscription = await tx.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found for this user');
    }

    const targetPlan = await tx.subscriptionPlan.findUnique({
      where: { code: planCode },
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
        'This plan does not have a higher quota than your current plan.',
      );
    }

    const startedAt = new Date();
    const expiresAt = addMonths(startedAt, targetPlan.durationMonths);

    return tx.subscription.update({
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

  /** ต่ออายุแพ็กเกจเดิม — เรียกหลังยืนยันการชำระเงินแล้วเช่นเดียวกับ applyUpgrade */
  async applyRenewal(userId: string, tx: Prisma.TransactionClient) {
    const subscription = await tx.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found for this user');
    }

    if (subscription.plan.isFree || subscription.plan.durationMonths === null) {
      throw new BadRequestException(
        'Free Plan never expires, so it cannot be renewed',
      );
    }

    // ต่ออายุก่อนหมด = ต่อจากวันหมดเดิม / ต่อหลังหมดแล้ว = เริ่มนับจากวันนี้
    const now = new Date();
    const base =
      subscription.expiresAt && subscription.expiresAt.getTime() > now.getTime()
        ? subscription.expiresAt
        : now;
    const expiresAt = addMonths(base, subscription.plan.durationMonths);

    return tx.subscription.update({
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
