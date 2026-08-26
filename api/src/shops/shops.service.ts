import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import {
  calculateShopQuota,
  isSubscriptionReadOnly,
} from '../subscriptions/subscription-quota.util';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateShopDto, UpdateShopDto } from './dto/shop.dto';

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // TODO(staff-resource): พนักงานควรเห็นเฉพาะร้านที่ตัวเองถูกมอบหมาย ผ่าน
  // ตาราง shop_staffs ที่ยังไม่มีในระบบ ตอนนี้คืนเฉพาะร้านที่ userId เป็น
  // เจ้าของเท่านั้น
  list(userId: string) {
    return this.prisma.shop.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  getById(userId: string, shopId: string) {
    return this.findOwnedShopOrThrow(userId, shopId);
  }

  async create(userId: string, dto: CreateShopDto) {
    const subscription =
      await this.subscriptionsService.getSubscriptionWithPlanOrThrow(userId);

    if (
      isSubscriptionReadOnly({
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      })
    ) {
      throw new ForbiddenException(
        'Account is in read-only mode because the subscription has expired. Please renew first.',
      );
    }

    const usedShopCount = await this.prisma.shop.count({
      where: { ownerId: userId, deletedAt: null },
    });

    const quota = calculateShopQuota({
      status: subscription.status,
      includedShopQuota: subscription.plan.includedShopQuota,
      usedShopCount,
    });

    if (!quota.canCreateShop) {
      throw new ForbiddenException(
        'Cannot create a new shop: shop quota is used up or the subscription is not active. Buy extra quota or upgrade your plan.',
      );
    }

    return this.prisma.shop.create({
      data: { ...dto, ownerId: userId },
    });
  }

  async update(userId: string, shopId: string, dto: UpdateShopDto) {
    await this.assertNotReadOnly(userId);
    await this.findOwnedShopOrThrow(userId, shopId);

    return this.prisma.shop.update({
      where: { id: shopId },
      data: dto,
    });
  }

  async remove(userId: string, shopId: string) {
    await this.assertNotReadOnly(userId);
    await this.findOwnedShopOrThrow(userId, shopId);

    // TODO(shop-products-resource, staff-resource): ตาม ER note ของ shops
    // ต้องตั้ง shop_products.status = INACTIVE และ shop_staffs.removed_at
    // ให้ทุกแถวของร้านนี้ในทรานแซกชันเดียวกันด้วย แต่สองตารางนั้นยังไม่มีใน
    // ระบบ (รอ feature/shop-products-resource, feature/staff-resource) —
    // ตอนนี้ soft delete แค่ตัว shop เอง quota จะถูกคืนให้อัตโนมัติทันที
    // เพราะ getSubscriptionWithPlanOrThrow คำนวณ used สดจาก deletedAt เสมอ
    return this.prisma.shop.update({
      where: { id: shopId },
      data: { deletedAt: new Date() },
    });
  }

  private async findOwnedShopOrThrow(userId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, ownerId: userId, deletedAt: null },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  private async assertNotReadOnly(userId: string) {
    const subscription =
      await this.subscriptionsService.getSubscriptionWithPlanOrThrow(userId);

    if (
      isSubscriptionReadOnly({
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      })
    ) {
      throw new ForbiddenException(
        'Account is in read-only mode because the subscription has expired. Please renew first.',
      );
    }
  }
}
