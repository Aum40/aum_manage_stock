import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../database/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AiAccessService } from './ai-access.service';
import { AiRecommendationsGateway } from './ai-recommendations.gateway';
import type { ListRecommendationsQueryDto } from './dto/ai-recommendation.dto';
import {
  RECOMMENDATION_GENERATOR,
  type RecommendationGenerator,
  type ShopMetric,
} from './ports/recommendation-generator.port';

const METRIC_WINDOW_DAYS = 30;
/** คำแนะนำมีอายุ 7 วัน หลังจากนั้นตัวเลขที่อ้างถือว่าเก่าเกินจะเชื่อถือ */
const VALID_FOR_DAYS = 7;

@Injectable()
export class AiRecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AiAccessService,
    private readonly gateway: AiRecommendationsGateway,
    @Inject(RECOMMENDATION_GENERATOR)
    private readonly generator: RecommendationGenerator,
  ) {}

  /**
   * อ่านจาก cache เท่านั้น ไม่เรียก LLM
   * SRS §180 กำหนดให้ไม่เรียก LLM ตอน render แดชบอร์ด
   */
  async list(
    userId: string,
    shopId: string,
    query: ListRecommendationsQueryDto,
  ) {
    await this.access.assertCanViewAi(userId, shopId);

    return this.prisma.aiRecommendation.findMany({
      where: {
        shopId,
        ...(query.includeDismissed ? {} : { isDismissed: false }),
      },
      orderBy: { generatedAt: 'desc' },
      take: query.limit,
    });
  }

  async generate(userId: string, shopId: string) {
    await this.access.assertCanGenerateAi(userId, shopId);

    const metrics = await this.collectMetrics(shopId);
    const generated = await this.generator.generate(metrics);
    const byName = new Map(metrics.map((m) => [m.productName, m]));

    const validUntil = new Date(
      Date.now() + VALID_FOR_DAYS * 24 * 60 * 60 * 1000,
    );

    // สร้างรอบใหม่แทนที่รอบเก่าทั้งชุด กันคำแนะนำเก่าที่ตัวเลขไม่ตรงแล้วค้างอยู่
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.aiRecommendation.deleteMany({
        where: { shopId, isDismissed: false },
      });

      await tx.aiRecommendation.createMany({
        data: generated.map((item) => {
          const metric = byName.get(item.productName);

          return {
            shopId,
            shopProductId: metric?.shopProductId ?? null,
            type: item.type,
            title: item.title,
            content: item.content,
            metrics: (metric
              ? {
                  stockQty: metric.stockQty,
                  lowStockThreshold: metric.lowStockThreshold,
                  soldLast30Days: metric.soldLast30Days,
                  daysSinceLastSale: metric.daysSinceLastSale,
                }
              : Prisma.JsonNull) as Prisma.InputJsonValue,
            validUntil,
          };
        }),
      });

      return tx.aiRecommendation.findMany({
        where: { shopId, isDismissed: false },
        orderBy: { generatedAt: 'desc' },
      });
    });

    // SRS §180 ต้องอัปเดตแบบเรียลไทม์ — ดันผลใหม่เข้าห้องของร้านนั้น
    this.gateway.emitRecommendations(shopId, created);

    return created;
  }

  /**
   * path ไม่มี shopId จึงต้องหาร้านจากตัว recommendation ก่อน แล้วค่อยตรวจสิทธิ์
   * ถ้าไม่ทำ ใครก็ dismiss คำแนะนำของร้านคนอื่นได้
   */
  async dismiss(userId: string, recommendationId: string) {
    const recommendation = await this.prisma.aiRecommendation.findUnique({
      where: { id: recommendationId },
      select: { id: true, shopId: true },
    });

    if (!recommendation) {
      throw new NotFoundException('ไม่พบคำแนะนำนี้');
    }

    await this.access.assertCanGenerateAi(userId, recommendation.shopId);

    const dismissed = await this.prisma.aiRecommendation.update({
      where: { id: recommendationId },
      data: { isDismissed: true },
    });

    this.gateway.emitDismissed(recommendation.shopId, dismissed.id);

    return dismissed;
  }

  /** รวบรวมตัวเลขจริงจากสต็อกและยอดขายย้อนหลัง 30 วัน */
  private async collectMetrics(shopId: string): Promise<ShopMetric[]> {
    const since = new Date(
      Date.now() - METRIC_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const shopProducts = await this.prisma.shopProduct.findMany({
      where: { shopId, status: 'ACTIVE', product: { deletedAt: null } },
      select: {
        id: true,
        stockQty: true,
        lowStockThreshold: true,
        product: { select: { name: true, unit: true } },
      },
    });

    if (shopProducts.length === 0) return [];

    const ids = shopProducts.map((sp) => sp.id);

    const [sold, lastSales] = await Promise.all([
      this.prisma.saleItem.groupBy({
        by: ['shopProductId'],
        where: {
          shopProductId: { in: ids },
          sale: { status: 'COMPLETED', createdAt: { gte: since } },
        },
        _sum: { quantity: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['shopProductId'],
        where: { shopProductId: { in: ids }, sale: { status: 'COMPLETED' } },
        _max: { createdAt: true },
      }),
    ]);

    const soldMap = new Map(
      sold.map((row) => [row.shopProductId, row._sum.quantity ?? 0]),
    );
    const lastSaleMap = new Map(
      lastSales.map((row) => [row.shopProductId, row._max.createdAt]),
    );

    return shopProducts.map((sp) => {
      const lastSoldAt = lastSaleMap.get(sp.id) ?? null;

      return {
        shopProductId: sp.id,
        productName: sp.product.name,
        unit: sp.product.unit,
        stockQty: sp.stockQty,
        lowStockThreshold: sp.lowStockThreshold,
        soldLast30Days: soldMap.get(sp.id) ?? 0,
        daysSinceLastSale: lastSoldAt
          ? Math.floor((Date.now() - lastSoldAt.getTime()) / 86_400_000)
          : null,
      };
    });
  }
}
