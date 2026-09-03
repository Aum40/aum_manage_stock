import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../database/generated/prisma/client';
import { UserRole } from '../database/generated/prisma/enums';
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

    // นับแล้วสร้างต้องอยู่ในทรานแซกชันเดียวกัน ไม่งั้นสองรีเควสต์ที่ยิงพร้อมกัน
    // จะนับได้เท่ากันแล้วผ่านทั้งคู่ — เท่ากับสร้างร้านเกินโควตาที่จ่ายเงินมา
    // Serializable ให้ Postgres จับ read-write conflict นี้เอง (แบบเดียวกับ
    // StockService.adjust) ฝั่งที่แพ้จะได้ error แล้วผู้ใช้กดใหม่ได้
    return this.prisma.$transaction(
      async (tx) => {
        const usedShopCount = await tx.shop.count({
          where: { ownerId: userId, deletedAt: null },
        });

        const quota = calculateShopQuota({
          status: subscription.status,
          includedShopQuota: subscription.plan.includedShopQuota,
          usedShopCount,
        });

        if (!quota.canCreateShop) {
          throw new ForbiddenException(
            'Cannot create a new shop: shop quota is used up or the subscription is not active. Upgrade your plan to get more quota.',
          );
        }

        return tx.shop.create({
          data: { ...dto, ownerId: userId },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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

    // ตาม ER note ของ shops: การลบร้านต้องพาสองตารางลูกไปด้วยในทรานแซกชัน
    // เดียวกัน ไม่งั้นพนักงานจะยังผูกกับร้านที่ไม่มีอยู่แล้ว และ shop_products
    // จะยัง ACTIVE ค้างไว้ (ตอนที่เขียนครั้งแรกสองตารางนี้ยังไม่มีในระบบ)
    //
    // stock_movements / Sale / SaleItem ห้ามแตะ — เก็บเป็นหลักฐานตลอด
    const deletedAt = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.shopProduct.updateMany({
        where: { shopId, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      await tx.shopStaff.updateMany({
        where: { shopId, removedAt: null },
        data: { removedAt: deletedAt },
      });
      // quota คืนให้อัตโนมัติทันทีเพราะ used คำนวณสดจาก deletedAt เสมอ
      return tx.shop.update({
        where: { id: shopId },
        data: { deletedAt },
      });
    });
  }

  /**
   * เจ้าของร้าน "พักร้านชั่วคราวเอง" — คนละความหมายกับ status=SUSPENDED ที่
   * Admin เป็นคนตั้งเท่านั้น (SRS §185) ถ้าร้านถูก Admin ระงับอยู่แล้ว
   * เจ้าของแตะปุ่มนี้ไม่ได้เลย กันไม่ให้ปลดล็อกการระงับของ Admin ผ่านทางอ้อม
   *
   * พนักงาน resolve ownerId ได้เหมือนเจ้าของ (ดู @OwnerId()) แต่ต้องเช็ค role
   * แยกตรงนี้เพราะ "เจ้าของเท่านั้น" ไม่ใช่แค่ "เป็นเจ้าของข้อมูล"
   */
  async pause(userId: string, role: UserRole, shopId: string) {
    this.assertIsOwnerRole(role);
    await this.assertNotReadOnly(userId);
    const shop = await this.findOwnedShopOrThrow(userId, shopId);

    if (shop.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This shop is suspended by an administrator and cannot be controlled by the owner.',
      );
    }
    if (shop.pausedAt) {
      throw new ConflictException('This shop is already paused');
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: { pausedAt: new Date() },
    });
  }

  async resume(userId: string, role: UserRole, shopId: string) {
    this.assertIsOwnerRole(role);
    await this.assertNotReadOnly(userId);
    const shop = await this.findOwnedShopOrThrow(userId, shopId);

    if (shop.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'This shop is suspended by an administrator and cannot be controlled by the owner.',
      );
    }
    if (!shop.pausedAt) {
      throw new ConflictException('This shop is not paused');
    }

    return this.prisma.shop.update({
      where: { id: shopId },
      data: { pausedAt: null },
    });
  }

  private assertIsOwnerRole(role: UserRole) {
    if (role !== UserRole.SHOP_OWNER) {
      throw new ForbiddenException({
        message: 'Only the shop owner can pause or resume a shop, not staff.',
        code: 'OWNER_ONLY',
      });
    }
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
