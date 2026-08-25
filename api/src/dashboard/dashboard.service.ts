import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DashboardAccessService } from './dashboard-access.service';
import type {
  BestSellersQueryDto,
  DashboardQueryDto,
  DeadStockQueryDto,
  SalesTrendQueryDto,
} from './dto/dashboard.dto';
import { listPeriods, periodKey } from './period.util';

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

  async getAccountSummary(userId: string, query: DashboardQueryDto) {
    const ctx = await this.access.assertCanViewAccountDashboard(userId);
    await this.access.assertPaidPlan(ctx.ownerId);

    const shopIds = await this.access.listVisibleShopIds(ctx);
    const range = { from: query.from, to: query.to };

    if (shopIds.length === 0) {
      return {
        range,
        totals: { totalAmount: 0, saleCount: 0, shopCount: 0 },
        shops: [],
      };
    }

    const [shops, salesByShop, lowStockByShop] = await Promise.all([
      this.prisma.shop.findMany({
        where: { id: { in: shopIds } },
        select: { id: true, name: true },
      }),
      this.prisma.sale.groupBy({
        by: ['shopId'],
        where: {
          shopId: { in: shopIds },
          status: 'COMPLETED',
          createdAt: { gte: query.from, lte: query.to },
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      this.prisma.shopProduct.groupBy({
        by: ['shopId'],
        where: {
          shopId: { in: shopIds },
          status: 'ACTIVE',
          product: { deletedAt: null },
          stockQty: {
            gt: 0,
            lte: this.prisma.shopProduct.fields.lowStockThreshold,
          },
        },
        _count: { _all: true },
      }),
    ]);

    const salesByShopId = new Map(
      salesByShop.map((row) => [
        row.shopId,
        {
          totalAmount: Number(row._sum.totalAmount ?? 0),
          saleCount: row._count._all,
        },
      ]),
    );
    const lowStockByShopId = new Map(
      lowStockByShop.map((row) => [row.shopId, row._count._all]),
    );

    const rows = shops
      .map((shop) => {
        const sales = salesByShopId.get(shop.id);
        return {
          shopId: shop.id,
          name: shop.name,
          totalAmount: sales?.totalAmount ?? 0,
          saleCount: sales?.saleCount ?? 0,
          lowStock: lowStockByShopId.get(shop.id) ?? 0,
        };
      })
      .sort(
        (a, b) =>
          b.totalAmount - a.totalAmount || a.name.localeCompare(b.name, 'th'),
      );

    return {
      range,
      totals: {
        totalAmount: rows.reduce((sum, row) => sum + row.totalAmount, 0),
        saleCount: rows.reduce((sum, row) => sum + row.saleCount, 0),
        shopCount: rows.length,
      },
      shops: rows,
    };
  }

  async getSalesTrend(
    userId: string,
    shopId: string,
    query: SalesTrendQueryDto,
  ) {
    const ctx = await this.access.assertCanViewShopDashboard(userId, shopId);
    await this.access.assertPaidPlan(ctx.ownerId);

    const sales = await this.prisma.sale.findMany({
      where: this.completedSalesWhere(shopId, query),
      select: { createdAt: true, totalAmount: true },
    });

    const buckets = new Map<
      string,
      { totalAmount: number; saleCount: number }
    >();
    for (const period of listPeriods(query.from, query.to, query.groupBy)) {
      buckets.set(period, { totalAmount: 0, saleCount: 0 });
    }

    for (const sale of sales) {
      const bucket = buckets.get(periodKey(sale.createdAt, query.groupBy));
      if (!bucket) continue;
      bucket.totalAmount += Number(sale.totalAmount);
      bucket.saleCount += 1;
    }

    return {
      range: { from: query.from, to: query.to },
      groupBy: query.groupBy,
      points: [...buckets].map(([period, totals]) => ({ period, ...totals })),
    };
  }

  private completedSalesWhere(shopId: string, range: { from: Date; to: Date }) {
    return {
      shopId,
      status: 'COMPLETED' as const,
      createdAt: { gte: range.from, lte: range.to },
    };
  }
}
