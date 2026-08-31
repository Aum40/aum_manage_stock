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

    const [sales, activeProducts, lowStock, outOfStock, costs] =
      await Promise.all([
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
        this.costByShop([shopId], { from: query.from, to: query.to }),
      ]);

    const totalAmount = Number(sales._sum.totalAmount ?? 0);
    const saleCount = sales._count._all;
    const cost = costs.get(shopId) ?? { costAmount: 0, itemsWithoutCost: 0 };

    return {
      range: { from: query.from, to: query.to },
      sales: {
        totalAmount,
        saleCount,
        averageSaleAmount: saleCount === 0 ? 0 : totalAmount / saleCount,
        // กำไรขั้นต้น ไม่ใช่กำไรสุทธิ — ไม่ได้หักค่าเช่า ค่าแรง ค่าน้ำค่าไฟ
        costAmount: cost.costAmount,
        grossProfit: this.money(totalAmount - cost.costAmount),
        itemsWithoutCost: cost.itemsWithoutCost,
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

    /**
     * จัดกลุ่มด้วย shopProductId อย่างเดียว ห้ามใส่ productName เข้าไปด้วย
     *
     * productName ใน sale_items เป็น snapshot ณ ตอนขาย ไม่ใช่ชื่อปัจจุบัน
     * ถ้าเจ้าของร้านเปลี่ยนชื่อสินค้า บิลเก่าจะเก็บชื่อเดิม บิลใหม่เก็บชื่อใหม่
     * พอ groupBy ทั้งสองคอลัมน์ สินค้าตัวเดียวกันจะแตกเป็นหลายกลุ่ม —
     * ยอดถูกหารกัน อันดับเพี้ยนทั้งตาราง และของที่ขายดีที่สุดอาจหลุด top N
     * ไปเลย ส่วนฝั่งหน้าเว็บก็ได้ shopProductId ซ้ำจน React ฟ้อง duplicate key
     */
    const grouped = await this.prisma.saleItem.groupBy({
      by: ['shopProductId'],
      where: { sale: this.completedSalesWhere(shopId, query) },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: query.limit,
    });

    if (grouped.length === 0) {
      return { range: { from: query.from, to: query.to }, items: [] };
    }

    /**
     * ชื่อที่จะแสดงคือ snapshot ของบิลล่าสุดในช่วงนี้ ไม่ใช่ชื่อปัจจุบันใน
     * shop_products — ยังยึดกติกาเดิมของโมดูลที่ว่ารายงานย้อนหลังต้องใช้ชื่อ
     * ณ ตอนที่ขาย เพียงแต่เลือกมาอันเดียวแทนที่จะปล่อยให้แตกเป็นหลายแถว
     */
    const latestNames = await this.prisma.saleItem.findMany({
      where: {
        shopProductId: { in: grouped.map((row) => row.shopProductId) },
        sale: this.completedSalesWhere(shopId, query),
      },
      distinct: ['shopProductId'],
      orderBy: { createdAt: 'desc' },
      select: { shopProductId: true, productName: true },
    });

    const nameOf = new Map(
      latestNames.map((row) => [row.shopProductId, row.productName]),
    );

    return {
      range: { from: query.from, to: query.to },
      items: grouped.map((row, index) => ({
        rank: index + 1,
        shopProductId: row.shopProductId,
        productName: nameOf.get(row.shopProductId) ?? '',
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
        totals: {
          totalAmount: 0,
          saleCount: 0,
          shopCount: 0,
          costAmount: 0,
          grossProfit: 0,
          itemsWithoutCost: 0,
        },
        shops: [],
      };
    }

    const [shops, salesByShop, lowStockByShop, costs] = await Promise.all([
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
      this.costByShop(shopIds, { from: query.from, to: query.to }),
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
        const totalAmount = sales?.totalAmount ?? 0;
        const cost = costs.get(shop.id) ?? {
          costAmount: 0,
          itemsWithoutCost: 0,
        };
        return {
          shopId: shop.id,
          name: shop.name,
          totalAmount,
          saleCount: sales?.saleCount ?? 0,
          lowStock: lowStockByShopId.get(shop.id) ?? 0,
          costAmount: cost.costAmount,
          grossProfit: this.money(totalAmount - cost.costAmount),
          itemsWithoutCost: cost.itemsWithoutCost,
        };
      })
      .sort(
        (a, b) =>
          b.totalAmount - a.totalAmount || a.name.localeCompare(b.name, 'th'),
      );

    const totalAmount = this.money(
      rows.reduce((sum, row) => sum + row.totalAmount, 0),
    );
    const costAmount = this.money(
      rows.reduce((sum, row) => sum + row.costAmount, 0),
    );

    return {
      range,
      totals: {
        totalAmount,
        saleCount: rows.reduce((sum, row) => sum + row.saleCount, 0),
        shopCount: rows.length,
        costAmount,
        grossProfit: this.money(totalAmount - costAmount),
        itemsWithoutCost: rows.reduce(
          (sum, row) => sum + row.itemsWithoutCost,
          0,
        ),
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

  async getSalesByCategory(
    userId: string,
    shopId: string,
    query: DashboardQueryDto,
  ) {
    const ctx = await this.access.assertCanViewShopDashboard(userId, shopId);
    await this.access.assertPaidPlan(ctx.ownerId);

    const range = { from: query.from, to: query.to };

    const soldByProduct = await this.prisma.saleItem.groupBy({
      by: ['shopProductId'],
      where: { sale: this.completedSalesWhere(shopId, query) },
      _sum: { quantity: true, lineTotal: true },
    });

    if (soldByProduct.length === 0) {
      return { range, totalAmount: 0, categories: [] };
    }

    const shopProducts = await this.prisma.shopProduct.findMany({
      where: { id: { in: soldByProduct.map((row) => row.shopProductId) } },
      select: {
        id: true,
        product: {
          select: { categoryId: true, category: { select: { name: true } } },
        },
      },
    });

    const categoryOf = new Map(
      shopProducts.map((row) => [
        row.id,
        {
          categoryId: row.product.categoryId,
          categoryName: row.product.category?.name ?? null,
        },
      ]),
    );

    const buckets = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string | null;
        totalAmount: number;
        quantitySold: number;
      }
    >();

    for (const row of soldByProduct) {
      const category = categoryOf.get(row.shopProductId) ?? {
        categoryId: null,
        categoryName: null,
      };
      const key = category.categoryId ?? '';
      const bucket = buckets.get(key) ?? {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        totalAmount: 0,
        quantitySold: 0,
      };
      bucket.totalAmount += Number(row._sum.lineTotal ?? 0);
      bucket.quantitySold += row._sum.quantity ?? 0;
      buckets.set(key, bucket);
    }

    const totalAmount = [...buckets.values()].reduce(
      (sum, bucket) => sum + bucket.totalAmount,
      0,
    );

    const categories = [...buckets.values()]
      .map((bucket) => ({
        ...bucket,
        shareOfTotal:
          totalAmount === 0
            ? 0
            : Math.round((bucket.totalAmount / totalAmount) * 10_000) / 10_000,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return { range, totalAmount, categories };
  }

  /** เงินทศนิยมสองตำแหน่ง กันเศษลอยจากการบวกทีละแถว */
  private money(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * ต้นทุนของบิลที่ขายไปแล้วในช่วงเวลา แยกตามร้าน
   *
   * คิดจาก `sale_items.cost_price` ที่โมดูล sales snapshot ไว้ตอนเปิดบิล
   * ไม่ใช่ `shop_products.cost_price` ปัจจุบัน — ถ้าเจ้าของร้านขึ้นราคาทุนเดือนหน้า
   * กำไรของบิลเดือนนี้ต้องไม่ขยับตาม รายงานย้อนหลังถึงจะเชื่อถือได้
   *
   * ดึงแถวมาคูณเองแทน groupBy เพราะ Prisma รวมผลคูณของสองคอลัมน์ใน `_sum`
   * ไม่ได้ (เหตุผลเดียวกับที่ sales-trend จัดกลุ่มในโค้ด) ช่วงสูงสุด 365 วัน
   * จำนวนแถวจึงยังอยู่ในวิสัยที่ดึงมาคำนวณได้
   *
   * นับ `itemsWithoutCost` ไปด้วย เพราะ `cost_price` มี default 0 และหน้าเพิ่ม
   * สินค้าไม่ได้บังคับกรอกทุน สินค้าที่ปล่อยว่างจะดูเหมือนกำไร 100% ฝั่งหน้าเว็บ
   * ต้องเตือนได้ว่าตัวเลขนี้ยังไม่ครบ ไม่ใช่ปล่อยให้เข้าใจผิด
   *
   * นับแบบ distinct ตาม shopProductId ไม่ใช่นับแถว sale_items — สินค้าตัวเดียว
   * ที่ไม่มีทุนแต่ขายไป 50 บิลคือปัญหา 1 รายการที่ต้องไปแก้ ไม่ใช่ 50 รายการ
   * ตัวเลขนี้ไปโผล่เป็นข้อความ "N รายการยังไม่ได้ใส่ต้นทุน" ให้ผู้ใช้ไล่แก้
   */
  private async costByShop(
    shopIds: string[],
    range: { from: Date; to: Date },
  ): Promise<Map<string, { costAmount: number; itemsWithoutCost: number }>> {
    const byShop = new Map<
      string,
      { costAmount: number; itemsWithoutCost: number }
    >();
    const noCostProducts = new Map<string, Set<string>>();
    for (const shopId of shopIds) {
      byShop.set(shopId, { costAmount: 0, itemsWithoutCost: 0 });
      noCostProducts.set(shopId, new Set<string>());
    }

    if (shopIds.length === 0) return byShop;

    const items = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          shopId: { in: shopIds },
          status: 'COMPLETED',
          createdAt: { gte: range.from, lte: range.to },
        },
      },
      select: {
        quantity: true,
        costPrice: true,
        shopProductId: true,
        sale: { select: { shopId: true } },
      },
    });

    for (const item of items) {
      const bucket = byShop.get(item.sale.shopId);
      if (!bucket) continue;

      const cost = Number(item.costPrice);
      bucket.costAmount += cost * item.quantity;
      // ทุน 0 แปลว่ายังไม่เคยกรอกทุนให้สินค้านั้น ไม่ใช่ของที่ได้มาฟรี
      if (cost === 0) {
        noCostProducts.get(item.sale.shopId)?.add(item.shopProductId);
      }
    }

    for (const [shopId, bucket] of byShop) {
      bucket.costAmount = this.money(bucket.costAmount);
      bucket.itemsWithoutCost = noCostProducts.get(shopId)?.size ?? 0;
    }

    return byShop;
  }

  private completedSalesWhere(shopId: string, range: { from: Date; to: Date }) {
    return {
      shopId,
      status: 'COMPLETED' as const,
      createdAt: { gte: range.from, lte: range.to },
    };
  }
}
