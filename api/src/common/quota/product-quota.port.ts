import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export const PRODUCT_QUOTA_PROVIDER = Symbol('PRODUCT_QUOTA_PROVIDER');

export interface ProductQuotaProvider {
  getMaxActiveProducts(ownerId: string): Promise<number | null>;
}

export const PLAN_MAX_ACTIVE_PRODUCTS = {
  FREE: 100,
  PLUS: 3_000,
  PRO: 5_000,
} as const;

export const FREE_PLAN_MAX_ACTIVE_PRODUCTS = PLAN_MAX_ACTIVE_PRODUCTS.FREE;

@Injectable()
export class SubscriptionProductQuotaAdapter implements ProductQuotaProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getMaxActiveProducts(ownerId: string): Promise<number | null> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: ownerId },
      select: { plan: { select: { maxActiveProducts: true } } },
    });

    if (!subscription) return FREE_PLAN_MAX_ACTIVE_PRODUCTS;

    return subscription.plan.maxActiveProducts;
  }
}
