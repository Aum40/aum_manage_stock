import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../database/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AccountContextService } from '../common/access/account-context.service';
import type { ListNotificationQueryDto } from './dto/notification.dto';

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_TYPE = {
  LOW_STOCK: 'LOW_STOCK',
  SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED',
  PRODUCT_LIMIT_REACHED: 'PRODUCT_LIMIT_REACHED',
  SHOP_LIMIT_REACHED: 'SHOP_LIMIT_REACHED',
} as const;

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  shopId?: string | null;
  payload?: Prisma.InputJsonValue | null;
  dedupeWhileUnread?: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountContext: AccountContextService,
  ) {}

  async findAll(userId: string, query: ListNotificationQueryDto) {
    const ctx = await this.accountContext.resolve(userId);

    const where = {
      userId: ctx.userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.shopId ? { shopId: query.shopId } : {}),
    };

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId: ctx.userId, readAt: null },
      }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        unreadCount,
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const ctx = await this.accountContext.resolve(userId);

    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId: ctx.userId },
      select: { id: true, readAt: true },
    });

    if (!notification) throw new NotFoundException('ไม่พบการแจ้งเตือนนี้');

    if (notification.readAt) {
      return { id: notification.id, readAt: notification.readAt };
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
      select: { id: true, readAt: true },
    });
  }

  async markAllAsRead(userId: string) {
    const ctx = await this.accountContext.resolve(userId);

    const result = await this.prisma.notification.updateMany({
      where: { userId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });

    return { updated: result.count };
  }

  async create(input: CreateNotificationInput) {
    if (input.dedupeWhileUnread) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: input.userId,
          type: input.type,
          shopId: input.shopId ?? null,
          readAt: null,
        },
        select: { id: true },
      });
      if (existing) return existing;
    }

    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        shopId: input.shopId ?? null,
        payload: input.payload ?? undefined,
      },
      select: { id: true },
    });
  }

  async emit(input: CreateNotificationInput): Promise<void> {
    try {
      await this.create(input);
    } catch (error) {
      this.logger.error(
        `สร้างการแจ้งเตือน ${input.type} ให้ ${input.userId} ไม่สำเร็จ`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
