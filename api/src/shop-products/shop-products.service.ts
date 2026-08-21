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

  async add(userId: string, shopId: string, dto: AddShopProductDto) {
    const { ownerId } = await this.shopAccess.assertCanManageShopProducts(
      userId,
      shopId,
    );
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
        stockQty: 0,
        lowStockThreshold: dto.lowStockThreshold,
      },
      include: withProduct,
    });
  }

  async findAll(
    userId: string,
    shopId: string,
    query: ListShopProductQueryDto,
  ) {
    await this.shopAccess.assertCanViewShopProducts(userId, shopId);

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

  async findLowStock(userId: string, shopId: string) {
    await this.shopAccess.assertCanViewShopProducts(userId, shopId);

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

  async findOne(userId: string, shopId: string, shopProductId: string) {
    await this.shopAccess.assertCanViewShopProducts(userId, shopId);
    return this.getShopProductOrThrow(shopId, shopProductId);
  }

  async update(
    userId: string,
    shopId: string,
    shopProductId: string,
    dto: UpdateShopProductDto,
  ) {
    await this.shopAccess.assertCanManageShopProducts(userId, shopId);
    await this.getShopProductOrThrow(shopId, shopProductId);

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

  async remove(userId: string, shopId: string, shopProductId: string) {
    await this.shopAccess.assertCanManageShopProducts(userId, shopId);
    const shopProduct = await this.getShopProductOrThrow(shopId, shopProductId);

    if (shopProduct.status === 'INACTIVE')
      return { id: shopProductId, status: 'INACTIVE' as const };

    const updated = await this.prisma.shopProduct.update({
      where: { id: shopProductId },
      data: { status: 'INACTIVE' },
      select: { id: true, status: true },
    });
    return updated;
  }

  private async getShopProductOrThrow(shopId: string, shopProductId: string) {
    const shopProduct = await this.prisma.shopProduct.findFirst({
      where: { id: shopProductId, shopId },
      include: withProduct,
    });
    if (!shopProduct) throw new NotFoundException('ไม่พบสินค้านี้ในร้านนี้');
    return shopProduct;
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
