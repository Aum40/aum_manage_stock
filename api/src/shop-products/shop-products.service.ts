import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  SHOP_ACCESS_PROVIDER,
  type ShopAccessProvider,
} from '../common/shop-access/shop-access.port';
import type {
  AddShopProductDto,
  ListShopProductQueryDto,
  UpdateShopProductDto,
} from './dto/shop-product.dto';

const withProduct = {
  product: {
    select: {
      id: true,
      name: true,
      barcode: true,
      unit: true,
      imageUrl: true,
      categoryId: true,
    },
  },
} as const;

@Injectable()
export class ShopProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHOP_ACCESS_PROVIDER)
    private readonly shopAccess: ShopAccessProvider,
  ) {}

  /**
   * เลือกสินค้าจากคลังกลางมาขายที่ร้านนี้ + ตั้งราคาขาย/ต้นทุนของร้านนี้
   * ถ้าเคยขายแล้วแต่ถูกปิดไว้ (INACTIVE) ให้เปิดขายใหม่พร้อมอัปเดตราคา
   */
  async add(ownerId: string, shopId: string, dto: AddShopProductDto) {
    await this.assertAccess(ownerId, shopId);
    await this.assertProductBelongsToOwner(ownerId, dto.productId);

    const existing = await this.prisma.shopProduct.findUnique({
      where: { shopId_productId: { shopId, productId: dto.productId } },
    });

    if (existing && existing.status === 'ACTIVE') {
      throw new ConflictException({
        message: 'สินค้านี้ถูกเพิ่มเข้าร้านนี้อยู่แล้ว',
        code: 'SHOP_PRODUCT_ALREADY_EXISTS',
        shopProductId: existing.id,
      });
    }

    if (existing) {
      return this.prisma.shopProduct.update({
        where: { id: existing.id },
        data: {
          status: 'ACTIVE',
          sellPrice: dto.sellPrice,
          costPrice: dto.costPrice,
          lowStockThreshold: dto.lowStockThreshold,
        },
        include: withProduct,
      });
    }

    return this.prisma.shopProduct.create({
      data: {
        shopId,
        productId: dto.productId,
        sellPrice: dto.sellPrice,
        costPrice: dto.costPrice,
        stockQty: 0, // เริ่มที่ 0 เสมอ — เติมสต็อกผ่าน stock-movements เท่านั้น
        lowStockThreshold: dto.lowStockThreshold,
      },
      include: withProduct,
    });
  }

  async findAll(
    ownerId: string,
    shopId: string,
    query: ListShopProductQueryDto,
  ) {
    await this.assertAccess(ownerId, shopId);

    const where = {
      shopId,
      product: { deletedAt: null },
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            product: {
              deletedAt: null,
              OR: [
                { name: { contains: query.q, mode: 'insensitive' as const } },
                {
                  barcode: { contains: query.q, mode: 'insensitive' as const },
                },
              ],
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shopProduct.findMany({
        where,
        include: withProduct,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.shopProduct.count({ where }),
    ]);

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

  /** สินค้าที่สต็อกคงเหลือ <= จุดแจ้งเตือนของร้านนี้ */
  async findLowStock(ownerId: string, shopId: string) {
    await this.assertAccess(ownerId, shopId);

    return this.prisma.shopProduct.findMany({
      where: {
        shopId,
        status: 'ACTIVE',
        product: { deletedAt: null },
        stockQty: { lte: this.prisma.shopProduct.fields.lowStockThreshold },
      },
      include: withProduct,
      orderBy: { stockQty: 'asc' },
    });
  }

  async findOne(ownerId: string, shopId: string, shopProductId: string) {
    await this.assertAccess(ownerId, shopId);

    const shopProduct = await this.prisma.shopProduct.findFirst({
      where: { id: shopProductId, shopId },
      include: withProduct,
    });
    if (!shopProduct) throw new NotFoundException('ไม่พบสินค้านี้ในร้านนี้');
    return shopProduct;
  }

  async update(
    ownerId: string,
    shopId: string,
    shopProductId: string,
    dto: UpdateShopProductDto,
  ) {
    await this.findOne(ownerId, shopId, shopProductId);

    return this.prisma.shopProduct.update({
      where: { id: shopProductId },
      data: {
        ...(dto.sellPrice !== undefined ? { sellPrice: dto.sellPrice } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
        ...(dto.lowStockThreshold !== undefined
          ? { lowStockThreshold: dto.lowStockThreshold }
          : {}),
      },
      include: withProduct,
    });
  }

  /**
   * "เลิกขายที่ร้านนี้" — ไม่ลบแถวจริง เพราะ stock_movements/sale_items
   * ของดิวอ้าง shop_product_id อยู่ ลบทิ้งแล้วประวัติขาด
   * และไม่กระทบร้านอื่นเพราะเป็นแถวคนละร้าน
   */
  async remove(ownerId: string, shopId: string, shopProductId: string) {
    const shopProduct = await this.findOne(ownerId, shopId, shopProductId);

    if (shopProduct.status === 'INACTIVE')
      return { id: shopProductId, status: 'INACTIVE' as const };

    const updated = await this.prisma.shopProduct.update({
      where: { id: shopProductId },
      data: { status: 'INACTIVE' },
      select: { id: true, status: true },
    });
    return updated;
  }

  private assertAccess(ownerId: string, shopId: string): Promise<void> {
    return this.shopAccess.assertCanManageShopProducts(ownerId, shopId);
  }

  private async assertProductBelongsToOwner(
    ownerId: string,
    productId: string,
  ): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, ownerId, deletedAt: null },
      select: { id: true },
    });
    if (!product)
      throw new NotFoundException('ไม่พบสินค้านี้ในคลังสินค้าของคุณ');
  }
}
