import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import type { PrismaService } from '../database/prisma.service';
import type { AccountContextService } from '../common/access/account-context.service';

type PrismaMock = {
  product: {
    create: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    findMany: jest.Mock;
  };
  shopProduct: { updateMany: jest.Mock };
  categories: { findFirst: jest.Mock };
  $transaction: jest.Mock;
};

const OWNER = '0199a0e0-0000-7000-8000-000000000001';
const STAFF = '0199a0e0-0000-7000-8000-0000000000ff';

function createPrismaMock(): PrismaMock {
  return {
    product: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    shopProduct: { updateMany: jest.fn() },
    categories: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
}

const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const anyDate = (): unknown => expect.any(Date);

describe('ProductsService', () => {
  let prisma: PrismaMock;
  let quota: { getMaxActiveProducts: jest.Mock };
  let accountContext: {
    resolve: jest.Mock;
    assertCanManageCatalog: jest.Mock;
    assertNotReadOnly: jest.Mock;
  };
  let service: ProductsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    quota = { getMaxActiveProducts: jest.fn().mockResolvedValue(100) };
    accountContext = {
      resolve: jest
        .fn()
        .mockResolvedValue({ userId: OWNER, ownerId: OWNER, isStaff: false }),
      assertCanManageCatalog: jest.fn().mockResolvedValue(undefined),
      assertNotReadOnly: jest.fn().mockResolvedValue(undefined),
    };
    service = new ProductsService(
      prisma as unknown as PrismaService,
      accountContext as unknown as AccountContextService,
      quota,
    );
  });

  describe('create', () => {
    it('บันทึกสินค้าได้เมื่อยังไม่เต็มโควตาและบาร์โค้ดไม่ซ้ำ', async () => {
      prisma.product.count.mockResolvedValue(3);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 'p1' });

      const result = await service.create(OWNER, {
        name: 'โค้ก 325ml',
        unit: 'กระป๋อง',
        barcode: '8851959132012',
      });

      expect(result).toEqual({ id: 'p1' });
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: containing({
          ownerId: OWNER,
          barcode: '8851959132012',
        }),
      });
    });

    it('ห้ามเพิ่มเมื่อสินค้า active เต็มโควตาแพ็กเกจ', async () => {
      prisma.product.count.mockResolvedValue(100);

      await expect(
        service.create(OWNER, { name: 'สินค้าใหม่', unit: 'ชิ้น' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('โควตาอ่านจากแพ็กเกจจริง — Pro (5,000) ยังเพิ่มได้ทั้งที่มีอยู่ 3,000', async () => {
      quota.getMaxActiveProducts.mockResolvedValue(5_000);
      prisma.product.count.mockResolvedValue(3_000);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 'p9' });

      await service.create(OWNER, { name: 'สินค้า', unit: 'ชิ้น' });

      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('ไม่จำกัดจำนวนเมื่อ quota provider คืน null', async () => {
      quota.getMaxActiveProducts.mockResolvedValue(null);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 'p2' });

      await service.create(OWNER, { name: 'สินค้า', unit: 'ชิ้น' });

      expect(prisma.product.count).not.toHaveBeenCalled();
      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('แพ็กเกจหมดอายุ (read-only) -> 403 และไม่แตะ DB', async () => {
      accountContext.assertCanManageCatalog.mockRejectedValue(
        new ForbiddenException({ code: 'SUBSCRIPTION_READ_ONLY' }),
      );

      await expect(
        service.create(OWNER, { name: 'สินค้า', unit: 'ชิ้น' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.product.create).not.toHaveBeenCalled();
      expect(prisma.product.count).not.toHaveBeenCalled();
    });

    it('พนักงานที่ไม่มีสิทธิ์ canManageProduct -> 403', async () => {
      accountContext.resolve.mockResolvedValue({
        userId: STAFF,
        ownerId: OWNER,
        isStaff: true,
      });
      accountContext.assertCanManageCatalog.mockRejectedValue(
        new ForbiddenException({ code: 'PRODUCT_PERMISSION_DENIED' }),
      );

      await expect(
        service.create(STAFF, { name: 'สินค้า', unit: 'ชิ้น' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('บาร์โค้ดซ้ำในคลังของ owner เดียวกัน -> 409', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findFirst.mockResolvedValue({
        id: 'old',
        name: 'โค้กเดิม',
      });

      await expect(
        service.create(OWNER, {
          name: 'โค้กใหม่',
          unit: 'กระป๋อง',
          barcode: '8851959132012',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('สินค้าที่ไม่มีบาร์โค้ดเพิ่มซ้ำได้ ไม่ต้องเช็คชน', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.create.mockResolvedValue({ id: 'p3' });

      await service.create(OWNER, { name: 'ของชั่งกิโล', unit: 'กก.' });

      expect(prisma.product.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('พนักงานเห็นคลังของ owner ที่ตัวเองสังกัด ไม่ใช่คลังของตัวเอง', async () => {
      accountContext.resolve.mockResolvedValue({
        userId: STAFF,
        ownerId: OWNER,
        isStaff: true,
      });
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(STAFF, { page: 1, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        containing({ where: containing({ ownerId: OWNER, deletedAt: null }) }),
      );
    });
  });

  describe('findByBarcode', () => {
    it('คืนสินค้าชิ้นเดียว ไม่ใช่ array', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', barcode: '123' });

      const result = await service.findByBarcode(OWNER, '123');

      expect(Array.isArray(result)).toBe(false);
      expect(result).toEqual({ id: 'p1', barcode: '123' });
    });

    it('ไม่เจอ -> 404', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.findByBarcode(OWNER, '404')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('soft delete และปิดการขายในทุกร้านใน transaction เดียว', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', ownerId: OWNER });
      prisma.$transaction.mockResolvedValue([]);

      const result = await service.remove(OWNER, 'p1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { deletedAt: anyDate() },
      });
      expect(prisma.shopProduct.updateMany).toHaveBeenCalledWith({
        where: { productId: 'p1', status: 'ACTIVE' },
        data: { status: 'INACTIVE' },
      });
      expect(result.id).toBe('p1');
    });

    it('ลบสินค้าของ owner คนอื่นไม่ได้', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.remove(OWNER, 'p1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
