import { PrismaService } from '@/database/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
  UserRole,
  UserStatus,
} from '@/database/generated/prisma/enums';
import {
  ListShopsQueryDto,
  ListUsersQueryDto,
} from '@/admin/dto/list-query.dto';
import { AdminRole } from '@/admin/dto/update-admin-role.dto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/** ไม่ส่ง password / twoFactorSecretEnc ออกไปเด็ดขาด จึงเลือกฟิลด์เองทั้งหมด */
const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  emailVerifiedAt: true,
  username: true,
  lineUserId: true,
  googleId: true,
  ownerId: true,
  role: true,
  twoFactorEnabled: true,
  status: true,
  lastLoginAt: true,
  deletedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================================
  // ผู้ใช้ (SRS §184-185)
  // =====================================================================

  /** SRS §184 บอกให้ดู "ทั้งหมด" จึงรวมบัญชีที่ถูก soft delete ไว้ด้วย
   *  แต่ส่ง deletedAt กลับไปให้หน้าเว็บแยกแสดงสถานะได้ */
  async listUsers(query: ListUsersQueryDto) {
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              {
                firstName: { contains: query.q, mode: 'insensitive' as const },
              },
              { lastName: { contains: query.q, mode: 'insensitive' as const } },
              { email: { contains: query.q, mode: 'insensitive' as const } },
              { username: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return this.paginated(items, total, query);
  }

  async suspendUser(actorId: string, targetId: string, reason: string) {
    const actor = await this.requireUser(actorId);
    const target = await this.requireUser(targetId);

    if (actor.id === target.id) {
      throw new BadRequestException('Cannot suspend your own account');
    }
    // SUPER_ADMIN ระงับไม่ได้เลย กันกรณีระงับกันเองจนไม่เหลือใครปลดล็อกได้
    if (target.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('A Super Admin account cannot be suspended');
    }
    // SRS §29 — อำนาจเหนือบัญชี Admin เป็นของ Super Admin เท่านั้น
    if (target.role === UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only a Super Admin can suspend an Admin account',
      );
    }
    if (target.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('This account is already suspended');
    }

    // ระงับ + เตะออกจากระบบ + ลงบันทึก ต้องอยู่ในทรานแซกชันเดียว
    // ไม่งั้น refresh token เดิมยังต่ออายุได้ หรือระงับสำเร็จแต่ไม่มีประวัติ
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: target.id },
        data: { status: UserStatus.SUSPENDED },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.auditLog(
        actor.id,
        AdminAuditAction.USER_SUSPEND,
        'USER',
        target.id,
        {
          reason,
        },
      ),
    ]);

    return this.findUser(target.id);
  }

  async reactivateUser(actorId: string, targetId: string) {
    const actor = await this.requireUser(actorId);
    const target = await this.requireUser(targetId);

    if (target.role === UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Only a Super Admin can reactivate an Admin account',
      );
    }
    if (target.status === UserStatus.ACTIVE) {
      throw new BadRequestException('This account is already active');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: target.id },
        data: { status: UserStatus.ACTIVE },
      }),
      this.auditLog(
        actor.id,
        AdminAuditAction.USER_REACTIVATE,
        'USER',
        target.id,
      ),
    ]);

    return this.findUser(target.id);
  }

  /** SRS §29/§186 — เรียกได้เฉพาะ Super Admin (บังคับที่ @Roles ใน controller) */
  async updateAdminRole(actorId: string, targetId: string, role: AdminRole) {
    const target = await this.requireUser(targetId);

    if (actorId === targetId) {
      throw new BadRequestException('Cannot change your own role');
    }
    if (
      target.role !== UserRole.ADMIN &&
      target.role !== UserRole.SUPER_ADMIN
    ) {
      throw new BadRequestException(
        'This endpoint only changes the role of an existing Admin or Super Admin',
      );
    }
    if (target.role === role) {
      throw new BadRequestException(`This account is already ${role}`);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: target.id }, data: { role } }),
      this.auditLog(
        actorId,
        AdminAuditAction.USER_ROLE_CHANGE,
        'USER',
        target.id,
        { metadata: { from: target.role, to: role } },
      ),
    ]);

    return this.findUser(target.id);
  }

  // =====================================================================
  // ร้านค้า (SRS §184-185)
  // =====================================================================

  async listShops(query: ListShopsQueryDto) {
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.q
        ? { name: { contains: query.q, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shop.findMany({
        where,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.shop.count({ where }),
    ]);

    return this.paginated(items, total, query);
  }

  async suspendShop(actorId: string, shopId: string, reason: string) {
    const shop = await this.requireShop(shopId);
    if (shop.status === 'SUSPENDED') {
      throw new BadRequestException('This shop is already suspended');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shop.id },
        data: { status: 'SUSPENDED' },
      }),
      this.auditLog(actorId, AdminAuditAction.SHOP_SUSPEND, 'SHOP', shop.id, {
        reason,
      }),
    ]);

    return updated;
  }

  async reactivateShop(actorId: string, shopId: string) {
    const shop = await this.requireShop(shopId);
    if (shop.status === 'ACTIVE') {
      throw new BadRequestException('This shop is already active');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.shop.update({
        where: { id: shop.id },
        data: { status: 'ACTIVE' },
      }),
      this.auditLog(actorId, AdminAuditAction.SHOP_REACTIVATE, 'SHOP', shop.id),
    ]);

    return updated;
  }

  // =====================================================================
  // ภาพรวมระบบ (SRS §22/§76/§184)
  // =====================================================================

  async getOverview() {
    const activeOnly = { deletedAt: null };
    const countUsersWithRole = (role: UserRole) =>
      this.prisma.user.count({ where: { ...activeOnly, role } });

    const [
      shopOwners,
      shopStaff,
      admins,
      superAdmins,
      suspendedUsers,
      totalShops,
      suspendedShops,
      deletedShops,
      totalProducts,
      plans,
    ] = await this.prisma.$transaction([
      countUsersWithRole(UserRole.SHOP_OWNER),
      countUsersWithRole(UserRole.SHOP_STAFF),
      countUsersWithRole(UserRole.ADMIN),
      countUsersWithRole(UserRole.SUPER_ADMIN),
      this.prisma.user.count({
        where: { status: UserStatus.SUSPENDED, deletedAt: null },
      }),
      this.prisma.shop.count({ where: { deletedAt: null } }),
      this.prisma.shop.count({
        where: { status: 'SUSPENDED', deletedAt: null },
      }),
      this.prisma.shop.count({ where: { NOT: { deletedAt: null } } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.subscriptionPlan.findMany({
        select: {
          code: true,
          nameTh: true,
          _count: { select: { subscriptions: true } },
        },
        orderBy: { priceThb: 'asc' },
      }),
    ]);

    return {
      users: {
        total: shopOwners + shopStaff + admins + superAdmins,
        suspended: suspendedUsers,
        byRole: {
          SHOP_OWNER: shopOwners,
          SHOP_STAFF: shopStaff,
          ADMIN: admins,
          SUPER_ADMIN: superAdmins,
        },
      },
      shops: {
        total: totalShops,
        suspended: suspendedShops,
        deleted: deletedShops,
      },
      products: { total: totalProducts },
      subscriptions: plans.map((plan) => ({
        code: plan.code,
        nameTh: plan.nameTh,
        subscribers: plan._count.subscriptions,
      })),
    };
  }

  // =====================================================================
  // helpers
  // =====================================================================

  private paginated<T>(
    items: T[],
    total: number,
    query: { page: number; limit: number },
  ) {
    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * คืน promise ของ prisma ตรงๆ ไม่ await เพื่อให้เอาไปต่อใน $transaction ได้
   * บันทึกจะได้ commit พร้อมกับการเปลี่ยนสถานะเสมอ ไม่มีทางเกิดอย่างเดียว
   */
  private auditLog(
    actorId: string,
    action: AdminAuditAction,
    targetType: keyof typeof AdminAuditTargetType,
    targetId: string,
    extra?: { reason?: string; metadata?: Record<string, string> },
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        targetType: AdminAuditTargetType[targetType],
        targetId,
        reason: extra?.reason ?? null,
        metadata: extra?.metadata ?? undefined,
      },
    });
  }

  private async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private async requireShop(id: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id, deletedAt: null },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    return shop;
  }

  private findUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
  }
}
