import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardAccessService } from './dashboard-access.service';
import type {
  BestSellersQueryDto,
  DashboardQueryDto,
  DeadStockQueryDto,
} from './dto/dashboard.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DashboardAccessService,
  ) {}

  async getShopDashboard(
    userId: string,
    shopId: string,
    query: DashboardQueryDto,
  ) {
    await this.access.assertCanViewShopDashboard(userId, shopId);

    const [sales, activeProducts, lowStock, outOfStock] = await Promise.all([
      this.prisma.sale.aggregate({
        where: this.completedSalesWhere(shopId, query),
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.shopProduct.count({
        where: { shopId, status: 'ACTIVE', product: { deletedAt: null } },
      }),
      this.prisma.shopProduct.count({
        where: {
          shopId,
          status: 'ACTIVE',
          product: { deletedAt: null },
          stockQty: {
            gt: 0,
            lte: this.prisma.shopProduct.fields.lowStockThreshold,
          },
        },
      }),
      this.prisma.shopProduct.count({
        where: {
          shopId,
          status: 'ACTIVE',
          product: { deletedAt: null },
          stockQty: { lte: 0 },
        },
      }),
    ]);

    const totalAmount = Number(sales._sum.totalAmount ?? 0);
    const saleCount = sales._count._all;

    return {
      range: { from: query.from, to: query.to },
      sales: {
        totalAmount,
        saleCount,
        averageSaleAmount: saleCount === 0 ? 0 : totalAmount / saleCount,
      },
      stock: { activeProducts, lowStock, outOfStock },
      generatedAt: new Date(),
    };
  }

  async getBestSellers(
    userId: string,
    shopId: string,
    query: BestSellersQueryDto,
  ) {
    const ctx = await this.access.assertCanViewShopDashboard(userId, shopId);
    await this.access.assertPaidPlan(ctx.ownerId);

    const grouped = await this.prisma.saleItem.groupBy({
      by: ['shopProductId', 'productName'],
      where: { sale: this.completedSalesWhere(shopId, query) },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: query.limit,
    });

    return {
      range: { from: query.from, to: query.to },
      items: grouped.map((row, index) => ({
        rank: index + 1,
        shopProductId: row.shopProductId,
        productName: row.productName,
        quantitySold: row._sum.quantity ?? 0,
        totalAmount: Number(row._sum.lineTotal ?? 0),
      })),
    };
  }

  async getDeadStock(userId: string, shopId: string, query: DeadStockQueryDto) {
    const ctx = await this.access.assertCanViewShopDashboard(userId, shopId);
    await this.access.assertPaidPlan(ctx.ownerId);

    const now = new Date();
    const since = new Date(now.getTime() - query.days * DAY_MS);

    const inStock = await this.prisma.shopProduct.findMany({
      where: {
        shopId,
        status: 'ACTIVE',
        stockQty: { gt: 0 },
        product: { deletedAt: null },
      },
      select: {
        id: true,
        stockQty: true,
        product: { select: { name: true } },
      },
    });

    if (inStock.length === 0) {
      return { days: query.days, items: [] };
    }

    const soldRecently = await this.prisma.saleItem.groupBy({
      by: ['shopProductId'],
      where: {
        shopProductId: { in: inStock.map((row) => row.id) },
        sale: { shopId, status: 'COMPLETED', createdAt: { gte: since } },
      },
      _max: { createdAt: true },
    });

    const soldRecentlyIds = new Set(
      soldRecently.map((row) => row.shopProductId),
    );
    const stale = inStock.filter((row) => !soldRecentlyIds.has(row.id));

    if (stale.length === 0) {
      return { days: query.days, items: [] };
    }

    const lastSold = await this.prisma.saleItem.groupBy({
      by: ['shopProductId'],
      where: {
        shopProductId: { in: stale.map((row) => row.id) },
        sale: { shopId, status: 'COMPLETED' },
      },
      _max: { createdAt: true },
    });

    const lastSoldAt = new Map(
      lastSold.map((row) => [row.shopProductId, row._max.createdAt ?? null]),
    );

    const items = stale
      .map((row) => {
        const soldAt = lastSoldAt.get(row.id) ?? null;
        return {
          shopProductId: row.id,
          productName: row.product.name,
          stockQty: row.stockQty,
          lastSoldAt: soldAt,
          daysSinceLastSale:
            soldAt === null
              ? null
              : Math.floor((now.getTime() - soldAt.getTime()) / DAY_MS),
        };
      })
      .sort((a, b) => {
        if (a.daysSinceLastSale === null && b.daysSinceLastSale === null) {
          return a.productName.localeCompare(b.productName, 'th');
        }
        if (a.daysSinceLastSale === null) return -1;
        if (b.daysSinceLastSale === null) return 1;
        return b.daysSinceLastSale - a.daysSinceLastSale;
      });

    return { days: query.days, items };
  }

  private completedSalesWhere(shopId: string, range: { from: Date; to: Date }) {
    return {
      shopId,
      status: 'COMPLETED' as const,
      createdAt: { gte: range.from, lte: range.to },
    };
  }
}
