import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  PRODUCT_QUOTA_PROVIDER,
  type ProductQuotaProvider,
} from '../common/quota/product-quota.port';
import type {
  CreateProductDto,
  ListProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PRODUCT_QUOTA_PROVIDER)
    private readonly quota: ProductQuotaProvider,
  ) {}

  async create(ownerId: string, dto: CreateProductDto) {
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

  async findAll(ownerId: string, query: ListProductQueryDto) {
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

  async findOne(ownerId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, ownerId, deletedAt: null },
    });
    if (!product)
      throw new NotFoundException('ไม่พบสินค้านี้ในคลังสินค้าของคุณ');
    return product;
  }

  /**
   * SRS/ทีม: บาร์โค้ด unique ระดับ owner จึงคืน "ชิ้นเดียว" เสมอ (ไม่ใช่ array)
   * ดิวเอาไปใช้ตอนสแกนขายหน้าร้าน ต้อง resolve ได้ตัวเดียวชัดเจน
   */
  async findByBarcode(ownerId: string, barcodeValue: string) {
    const product = await this.prisma.product.findFirst({
      where: { ownerId, barcode: barcodeValue, deletedAt: null },
    });
    if (!product) throw new NotFoundException('ไม่พบสินค้าที่ใช้บาร์โค้ดนี้');
    return product;
  }

  async update(ownerId: string, id: string, dto: UpdateProductDto) {
    const current = await this.findOne(ownerId, id);

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

  /**
   * SRS: ลบสินค้าเป็น soft delete เสมอ เพื่อรักษาประวัติการขาย/สต็อกย้อนหลัง
   *
   * TODO(shop-products): เมื่อ feature/shop-products-resource เข้ามาแล้ว
   * ต้องปิดการขายสินค้านี้ในทุกร้านพร้อมกันในทรานแซกชันเดียว
   */
  async remove(ownerId: string, id: string) {
    await this.findOne(ownerId, id);
    const deletedAt = new Date();

    await this.prisma.product.update({ where: { id }, data: { deletedAt } });

    return { id, deletedAt };
  }

  /** SRS: Free Plan ครบ 100 รายการแล้วต้องห้ามเพิ่ม + แนะนำให้อัปเกรด */
  private async assertQuotaAvailable(ownerId: string): Promise<void> {
    const max = await this.quota.getMaxActiveProducts(ownerId);
    if (max === null) return;

    const activeCount = await this.prisma.product.count({
      where: { ownerId, deletedAt: null },
    });

    if (activeCount >= max) {
      throw new ForbiddenException({
        message: `จำนวนสินค้าถึงขีดจำกัดของแพ็กเกจแล้ว (${max} รายการ) กรุณาอัปเกรดแพ็กเกจเพื่อเพิ่มสินค้า`,
        code: 'PRODUCT_QUOTA_EXCEEDED',
        limit: max,
        used: activeCount,
      });
    }
  }

  /**
   * เช็คซ้ำระดับแอปเพื่อให้ error อ่านรู้เรื่อง
   * ตัวกันจริงคือ partial unique index uq_products_owner_barcode
   * (ดู prisma/sql/001_products_partial_indexes.sql)
   */
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
