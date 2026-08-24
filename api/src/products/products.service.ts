import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AccountContextService } from '../common/access/account-context.service';
import {
  PRODUCT_QUOTA_PROVIDER,
  type ProductQuotaProvider,
} from '../common/quota/product-quota.port';
import {
  NOTIFICATION_TYPE,
  NotificationsService,
} from '../notifications/notifications.service';
import type {
  CreateProductDto,
  ListProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountContext: AccountContextService,
    private readonly notifications: NotificationsService,
    @Inject(PRODUCT_QUOTA_PROVIDER)
    private readonly quota: ProductQuotaProvider,
  ) {}

  async create(userId: string, dto: CreateProductDto) {
    const ctx = await this.accountContext.resolve(userId);
    await this.accountContext.assertCanManageCatalog(ctx);

    const ownerId = ctx.ownerId;
    await this.assertQuotaAvailable(ownerId);
    await this.assertBarcodeIsFree(ownerId, dto.barcode ?? null);
    if (dto.categoryId)
      await this.assertCategoryBelongsToOwner(ownerId, dto.categoryId);

    return this.prisma.product.create({
      data: {
        ownerId,
        name: dto.name,
        unit: dto.unit,
        categoryId: dto.categoryId ?? null,
        barcode: dto.barcode ?? null,
        imageUrl: dto.imageUrl ?? null,
      },
    });
  }

  async findAll(userId: string, query: ListProductQueryDto) {
    const { ownerId } = await this.accountContext.resolve(userId);

    const where = {
      ownerId,
      deletedAt: null,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { barcode: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
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

  async findOne(userId: string, id: string) {
    const { ownerId } = await this.accountContext.resolve(userId);
    return this.getOwnedProduct(ownerId, id);
  }

  async findByBarcode(userId: string, barcodeValue: string) {
    const { ownerId } = await this.accountContext.resolve(userId);

    const product = await this.prisma.product.findFirst({
      where: { ownerId, barcode: barcodeValue, deletedAt: null },
    });
    if (!product) throw new NotFoundException('ไม่พบสินค้าที่ใช้บาร์โค้ดนี้');
    return product;
  }

  async update(userId: string, id: string, dto: UpdateProductDto) {
    const ctx = await this.accountContext.resolve(userId);
    await this.accountContext.assertCanManageCatalog(ctx);

    const ownerId = ctx.ownerId;
    const current = await this.getOwnedProduct(ownerId, id);

    if (dto.barcode !== undefined && dto.barcode !== current.barcode) {
      await this.assertBarcodeIsFree(ownerId, dto.barcode ?? null, id);
    }
    if (dto.categoryId)
      await this.assertCategoryBelongsToOwner(ownerId, dto.categoryId);

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.categoryId !== undefined
          ? { categoryId: dto.categoryId ?? null }
          : {}),
        ...(dto.barcode !== undefined ? { barcode: dto.barcode ?? null } : {}),
        ...(dto.imageUrl !== undefined
          ? { imageUrl: dto.imageUrl ?? null }
          : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    const ctx = await this.accountContext.resolve(userId);
    await this.accountContext.assertCanManageCatalog(ctx);
    await this.getOwnedProduct(ctx.ownerId, id);

    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.product.update({ where: { id }, data: { deletedAt } }),
      this.prisma.shopProduct.updateMany({
        where: { productId: id, status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      }),
    ]);

    return { id, deletedAt };
  }

  private async getOwnedProduct(ownerId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, ownerId, deletedAt: null },
    });
    if (!product)
      throw new NotFoundException('ไม่พบสินค้านี้ในคลังสินค้าของคุณ');
    return product;
  }

  private async assertQuotaAvailable(ownerId: string): Promise<void> {
    const max = await this.quota.getMaxActiveProducts(ownerId);
    if (max === null) return;

    const activeCount = await this.prisma.product.count({
      where: { ownerId, deletedAt: null },
    });

    if (activeCount >= max) {
      await this.notifications.emit({
        userId: ownerId,
        type: NOTIFICATION_TYPE.PRODUCT_LIMIT_REACHED,
        title: 'จำนวนสินค้าเต็มโควตาแพ็กเกจแล้ว',
        message: `คลังสินค้ามีสินค้าที่ใช้งานอยู่ ${activeCount} จาก ${max} รายการ อัปเกรดแพ็กเกจเพื่อเพิ่มสินค้าได้อีก`,
        payload: { limit: max, used: activeCount },
        dedupeWhileUnread: true,
      });

      throw new ForbiddenException({
        message: `จำนวนสินค้าถึงขีดจำกัดของแพ็กเกจแล้ว (${max} รายการ) กรุณาอัปเกรดแพ็กเกจเพื่อเพิ่มสินค้า`,
        code: 'PRODUCT_QUOTA_EXCEEDED',
        limit: max,
        used: activeCount,
      });
    }
  }

  private async assertBarcodeIsFree(
    ownerId: string,
    barcodeValue: string | null,
    exceptProductId?: string,
  ): Promise<void> {
    if (!barcodeValue) return;

    const duplicated = await this.prisma.product.findFirst({
      where: {
        ownerId,
        barcode: barcodeValue,
        deletedAt: null,
        ...(exceptProductId ? { id: { not: exceptProductId } } : {}),
      },
      select: { id: true, name: true },
    });

    if (duplicated) {
      throw new ConflictException({
        message: `บาร์โค้ดนี้ถูกใช้กับสินค้า "${duplicated.name}" อยู่แล้ว`,
        code: 'BARCODE_ALREADY_USED',
        productId: duplicated.id,
      });
    }
  }

  private async assertCategoryBelongsToOwner(
    ownerId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.prisma.categories.findFirst({
      where: { id: categoryId, ownerId },
      select: { id: true },
    });
    if (!category) throw new NotFoundException('ไม่พบหมวดหมู่นี้ในบัญชีของคุณ');
  }
}
