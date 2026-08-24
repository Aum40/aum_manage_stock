import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ShopProductsService } from './shop-products.service';
import type { PrismaService } from '../database/prisma.service';

const OWNER = '0199a0e0-0000-7000-8000-000000000001';
const STAFF = '0199a0e0-0000-7000-8000-0000000000ff';
const SHOP_ID = '0199a0e0-0000-7000-8000-0000000000aa';
const PRODUCT_ID = '0199a0e0-0000-7000-8000-0000000000bb';

function createPrismaMock() {
  return {
    product: { findFirst: jest.fn() },
    shopProduct: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      fields: { lowStockThreshold: Symbol('lowStockThreshold') },
    },
    $transaction: jest.fn(),
  };
}

const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

describe('ShopProductsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let shopAccess: {
    assertCanViewShopProducts: jest.Mock;
    assertCanManageShopProducts: jest.Mock;
  };
  let service: ShopProductsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    const ctx = { userId: OWNER, ownerId: OWNER, isStaff: false };
    shopAccess = {
      assertCanViewShopProducts: jest.fn().mockResolvedValue(ctx),
      assertCanManageShopProducts: jest.fn().mockResolvedValue(ctx),
    };
    service = new ShopProductsService(
      prisma as unknown as PrismaService,
      shopAccess,
    );
  });

  describe('add', () => {
    it('เพิ่มสินค้าเข้าร้านพร้อมราคาขายและต้นทุนของร้านนี้', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      prisma.shopProduct.findUnique.mockResolvedValue(null);
      prisma.shopProduct.create.mockResolvedValue({ id: 'sp1' });

      await service.add(OWNER, SHOP_ID, {
        productId: PRODUCT_ID,
        sellPrice: 20,
        costPrice: 14.5,
        lowStockThreshold: 3,
      });

      expect(shopAccess.assertCanManageShopProducts).toHaveBeenCalledWith(
        OWNER,
        SHOP_ID,
      );
      expect(prisma.shopProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: containing({ sellPrice: 20, costPrice: 14.5 }),
        }),
      );
    });

    it('ยิงใส่ร้านที่ไม่ใช่ของตัวเอง -> 404 และไม่แตะ DB', async () => {
      shopAccess.assertCanManageShopProducts.mockRejectedValue(
        new NotFoundException('ไม่พบร้านค้านี้'),
      );

      await expect(
        service.add(OWNER, SHOP_ID, {
          productId: PRODUCT_ID,
          sellPrice: 20,
          costPrice: 14,
          lowStockThreshold: 0,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.product.findFirst).not.toHaveBeenCalled();
      expect(prisma.shopProduct.create).not.toHaveBeenCalled();
    });

    it('พนักงานที่ไม่มีสิทธิ์ canManageProduct -> 403', async () => {
      shopAccess.assertCanManageShopProducts.mockRejectedValue(
        new ForbiddenException({ code: 'PRODUCT_PERMISSION_DENIED' }),
      );

      await expect(
        service.add(STAFF, SHOP_ID, {
          productId: PRODUCT_ID,
          sellPrice: 20,
          costPrice: 14,
          lowStockThreshold: 0,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.shopProduct.create).not.toHaveBeenCalled();
    });

    it('แพ็กเกจหมดอายุ (read-only) -> 403', async () => {
      shopAccess.assertCanManageShopProducts.mockRejectedValue(
        new ForbiddenException({ code: 'SUBSCRIPTION_READ_ONLY' }),
      );

      await expect(
        service.add(OWNER, SHOP_ID, {
          productId: PRODUCT_ID,
          sellPrice: 20,
          costPrice: 14,
          lowStockThreshold: 0,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('เพิ่มซ้ำในร้านเดิมที่ยังขายอยู่ -> 409', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      prisma.shopProduct.findUnique.mockResolvedValue({
        id: 'sp1',
        status: 'ACTIVE',
      });

      await expect(
        service.add(OWNER, SHOP_ID, {
          productId: PRODUCT_ID,
          sellPrice: 20,
          costPrice: 14,
          lowStockThreshold: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('เคยเลิกขายไว้ (INACTIVE) -> เปิดขายใหม่พร้อมอัปเดตราคา ไม่สร้างแถวซ้ำ', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      prisma.shopProduct.findUnique.mockResolvedValue({
        id: 'sp1',
        status: 'INACTIVE',
      });
      prisma.shopProduct.update.mockResolvedValue({
        id: 'sp1',
        status: 'ACTIVE',
      });

      await service.add(OWNER, SHOP_ID, {
        productId: PRODUCT_ID,
        sellPrice: 25,
        costPrice: 15,
        lowStockThreshold: 2,
      });

      expect(prisma.shopProduct.create).not.toHaveBeenCalled();
      expect(prisma.shopProduct.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sp1' },
          data: containing({ status: 'ACTIVE', sellPrice: 25 }),
        }),
      );
    });

    it('เอาสินค้าของ owner คนอื่นมาขายไม่ได้', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.add(OWNER, SHOP_ID, {
          productId: PRODUCT_ID,
          sellPrice: 10,
          costPrice: 5,
          lowStockThreshold: 0,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ใช้ ownerId ที่ resolve จาก access provider ไม่ใช่ userId ที่ยิงมา', async () => {
      shopAccess.assertCanManageShopProducts.mockResolvedValue({
        userId: STAFF,
        ownerId: OWNER,
        isStaff: true,
      });
      prisma.product.findFirst.mockResolvedValue({ id: PRODUCT_ID });
      prisma.shopProduct.findUnique.mockResolvedValue(null);
      prisma.shopProduct.create.mockResolvedValue({ id: 'sp1' });

      await service.add(STAFF, SHOP_ID, {
        productId: PRODUCT_ID,
        sellPrice: 20,
        costPrice: 14,
        lowStockThreshold: 0,
      });

      expect(prisma.product.findFirst).toHaveBeenCalledWith(
        containing({ where: containing({ ownerId: OWNER }) }),
      );
    });
  });

  describe('findAll', () => {
    it('การอ่านใช้สิทธิ์ระดับ view — read-only ยังดูได้', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(OWNER, SHOP_ID, { page: 1, limit: 20 });

      expect(shopAccess.assertCanViewShopProducts).toHaveBeenCalledWith(
        OWNER,
        SHOP_ID,
      );
      expect(shopAccess.assertCanManageShopProducts).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('เลิกขายที่ร้านนี้ = ปิดสถานะ ไม่ลบแถว (กันประวัติขาย/สต็อกขาด)', async () => {
      prisma.shopProduct.findFirst.mockResolvedValue({
        id: 'sp1',
        status: 'ACTIVE',
      });
      prisma.shopProduct.update.mockResolvedValue({
        id: 'sp1',
        status: 'INACTIVE',
      });

      const result = await service.remove(OWNER, SHOP_ID, 'sp1');

      expect(prisma.shopProduct.update).toHaveBeenCalledWith({
        where: { id: 'sp1' },
        data: { status: 'INACTIVE' },
        select: { id: true, status: true },
      });
      expect(result.status).toBe('INACTIVE');
    });

    it('ไม่พบสินค้าในร้านนี้ -> 404', async () => {
      prisma.shopProduct.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(OWNER, SHOP_ID, 'sp1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
