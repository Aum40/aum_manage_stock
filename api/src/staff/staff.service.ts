import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  AssignStaffDto,
  StaffPermissionsDto,
} from './dto/staff.dto';

const SAFE_STAFF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  username: true,
  lineUserId: true,
  role: true,
  status: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  listAll(ownerId: string) {
    return this.prisma.user.findMany({
      where: { ownerId, role: 'SHOP_STAFF', deletedAt: null },
      select: SAFE_STAFF_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getQuota(ownerId: string) {
    const subscription =
      await this.subscriptionsService.getSubscriptionWithPlanOrThrow(
        ownerId,
      );
    const used = await this.prisma.user.count({
      where: { ownerId, role: 'SHOP_STAFF', deletedAt: null },
    });
    const allowed = subscription.plan.includedStaffQuota;

    return { allowed, used, remaining: allowed - used };
  }

  async getDetail(ownerId: string, staffId: string) {
    return this.findOwnedStaffOrThrow(ownerId, staffId);
  }

  async assign(ownerId: string, staffId: string, dto: AssignStaffDto) {
    await this.findOwnedStaffOrThrow(ownerId, staffId);
    await this.findOwnedShopOrThrow(ownerId, dto.shopId);

    return this.prisma.$transaction(async (tx) => {
      const shopStaff = await tx.shopStaff.upsert({
        where: { shopId_userId: { shopId: dto.shopId, userId: staffId } },
        update: { removedAt: null, assignedAt: new Date() },
        create: { shopId: dto.shopId, userId: staffId },
      });

      // สร้าง permission แบบ all-false เฉพาะครั้งแรก — ถ้ากลับมา assign ซ้ำ
      // (เคย unassign ไปก่อนหน้า) ให้คงสิทธิ์เดิมไว้ ไม่รีเซ็ต
      await tx.staffPermission.upsert({
        where: { shopStaffId: shopStaff.id },
        update: {},
        create: { shopStaffId: shopStaff.id },
      });

      return tx.shopStaff.findUniqueOrThrow({
        where: { id: shopStaff.id },
        include: { permission: true, shop: true },
      });
    });
  }

  async unassign(ownerId: string, staffId: string, shopId: string) {
    await this.findOwnedStaffOrThrow(ownerId, staffId);
    const shopStaff = await this.findActiveShopStaffOrThrow(shopId, staffId);

    await this.prisma.shopStaff.update({
      where: { id: shopStaff.id },
      data: { removedAt: new Date() },
    });
  }

  async getShops(ownerId: string, staffId: string) {
    await this.findOwnedStaffOrThrow(ownerId, staffId);

    return this.prisma.shopStaff.findMany({
      where: { userId: staffId, removedAt: null },
      include: { shop: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async listShopStaff(ownerId: string, shopId: string) {
    await this.findOwnedShopOrThrow(ownerId, shopId);

    return this.prisma.shopStaff.findMany({
      where: { shopId, removedAt: null },
      include: { user: { select: SAFE_STAFF_SELECT }, permission: true },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async getPermissions(ownerId: string, shopId: string, staffId: string) {
    await this.findOwnedShopOrThrow(ownerId, shopId);
    const shopStaff = await this.findActiveShopStaffOrThrow(shopId, staffId);

    const permission = await this.prisma.staffPermission.findUnique({
      where: { shopStaffId: shopStaff.id },
    });

    if (!permission) {
      throw new NotFoundException('Permissions not found for this staff');
    }

    return permission;
  }

  async setPermissions(
    ownerId: string,
    shopId: string,
    staffId: string,
    dto: StaffPermissionsDto,
  ) {
    await this.findOwnedShopOrThrow(ownerId, shopId);
    const shopStaff = await this.findActiveShopStaffOrThrow(shopId, staffId);

    return this.prisma.staffPermission.update({
      where: { shopStaffId: shopStaff.id },
      data: { ...dto, grantedBy: ownerId },
    });
  }

  private async findOwnedStaffOrThrow(ownerId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: {
        id: staffId,
        ownerId,
        role: 'SHOP_STAFF',
        deletedAt: null,
      },
      select: SAFE_STAFF_SELECT,
    });

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
  }

  // เช็ค ownership เองแทนการ import ShopsService เพราะ ShopsModule ยังไม่ export
  // ShopsService ให้ module อื่น inject ได้ (ดู shops.module.ts)
  private async findOwnedShopOrThrow(ownerId: string, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, ownerId, deletedAt: null },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  private async findActiveShopStaffOrThrow(shopId: string, staffId: string) {
    const shopStaff = await this.prisma.shopStaff.findFirst({
      where: { shopId, userId: staffId, removedAt: null },
    });

    if (!shopStaff) {
      throw new NotFoundException('Staff is not assigned to this shop');
    }

    return shopStaff;
  }
}
