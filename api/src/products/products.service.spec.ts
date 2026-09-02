import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import type { PrismaService } from '../database/prisma.service';
import { AccountContextService } from '../common/access/account-context.service';
import type { NotificationsService } from '../notifications/notifications.service';

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
  let notifications: { emit: jest.Mock };
  let service: ProductsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    // create() นับโควตาซ้ำในทรานแซกชันเดียวกับการสร้าง เพื่อกันการยิงพร้อมกัน
    // แซงโควตา — mock จึงต้องส่ง client ตัวเดิมเข้า callback ให้
    prisma.$transaction.mockImplementation((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: PrismaMock) => unknown)(prisma)
        : arg,
    );
    quota = { getMaxActiveProducts: jest.fn().mockResolvedValue(100) };
    accountContext = {
      resolve: jest
        .fn()
        .mockResolvedValue({ userId: OWNER, ownerId: OWNER, isStaff: false }),
      assertCanManageCatalog: jest.fn().mockResolvedValue(undefined),
      assertNotReadOnly: jest.fn().mockResolvedValue(undefined),
    };
    notifications = { emit: jest.fn().mockResolvedValue(undefined) };
    service = new ProductsService(
      prisma as unknown as PrismaService,
      accountContext as unknown as AccountContextService,
      notifications as unknown as NotificationsService,
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

    it('โควตาเต็มแล้วต้องยิงแจ้งเตือน PRODUCT_LIMIT_REACHED ให้เจ้าของร้าน', async () => {
      prisma.product.count.mockResolvedValue(100);

      await expect(
        service.create(OWNER, { name: 'สินค้าใหม่', unit: 'ชิ้น' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(notifications.emit).toHaveBeenCalledWith(
        containing({
          userId: OWNER,
          type: 'PRODUCT_LIMIT_REACHED',
          dedupeWhileUnread: true,
        }),
      );
    });

    it('โควตายังไม่เต็มต้องไม่ยิงแจ้งเตือน', async () => {
      prisma.product.count.mockResolvedValue(3);
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 'p1' });

      await service.create(OWNER, { name: 'สินค้า', unit: 'ชิ้น' });

      expect(notifications.emit).not.toHaveBeenCalled();
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
  describe('ด่านตรวจสิทธิ์พนักงาน (ใช้ AccountContextService ตัวจริง)', () => {
    let realPrisma: {
      user: { findFirst: jest.Mock };
      shopStaff: { findFirst: jest.Mock };
      subscription: { findUnique: jest.Mock };
      product: { create: jest.Mock; findFirst: jest.Mock; count: jest.Mock };
      $transaction: jest.Mock;
    };
    let realContext: AccountContextService;
    let staffService: ProductsService;

    beforeEach(() => {
      realPrisma = {
        user: { findFirst: jest.fn() },
        shopStaff: { findFirst: jest.fn() },
        subscription: { findUnique: jest.fn().mockResolvedValue(null) },
        product: {
          create: jest.fn().mockResolvedValue({ id: 'p1' }),
          findFirst: jest.fn().mockResolvedValue(null),
          count: jest.fn().mockResolvedValue(0),
        },
        $transaction: jest.fn(),
      };
      realPrisma.$transaction.mockImplementation((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: typeof realPrisma) => unknown)(realPrisma)
          : arg,
      );
      realContext = new AccountContextService(
        realPrisma as unknown as PrismaService,
      );
      staffService = new ProductsService(
        realPrisma as unknown as PrismaService,
        realContext,
        notifications as unknown as NotificationsService,
        quota,
      );
    });

    it('resolve() ต้องแยกออกว่าเป็นพนักงาน เมื่อได้รับ users.id ของพนักงาน', async () => {
      realPrisma.user.findFirst.mockResolvedValue({
        id: STAFF,
        ownerId: OWNER,
        status: 'ACTIVE',
      });

      await expect(realContext.resolve(STAFF)).resolves.toEqual({
        userId: STAFF,
        ownerId: OWNER,
        isStaff: true,
      });
    });

    it('พนักงานที่ไม่มีสิทธิ์ canManageProduct -> 403', async () => {
      realPrisma.user.findFirst.mockResolvedValue({
        id: STAFF,
        ownerId: OWNER,
        status: 'ACTIVE',
      });
      realPrisma.shopStaff.findFirst.mockResolvedValue(null);

      await expect(
        staffService.create(STAFF, { name: 'สินค้า', unit: 'ชิ้น' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(realPrisma.product.create).not.toHaveBeenCalled();
    });

    it('พนักงานที่ได้รับสิทธิ์แล้วเพิ่มสินค้าได้', async () => {
      realPrisma.user.findFirst.mockResolvedValue({
        id: STAFF,
        ownerId: OWNER,
        status: 'ACTIVE',
      });
      realPrisma.shopStaff.findFirst.mockResolvedValue({ id: 'assignment-1' });

      await staffService.create(STAFF, { name: 'สินค้า', unit: 'ชิ้น' });

      expect(realPrisma.product.create).toHaveBeenCalledWith({
        data: containing({ ownerId: OWNER }),
      });
    });

    it('ถ้า controller ส่ง owner id แทน id ของพนักงาน ด่านตรวจจะถูกข้าม — กันการเปลี่ยนกลับไปใช้ @OwnerId()', async () => {
      realPrisma.user.findFirst.mockResolvedValue({
        id: OWNER,
        ownerId: null,
        status: 'ACTIVE',
      });
      realPrisma.shopStaff.findFirst.mockResolvedValue(null);

      await staffService.create(OWNER, { name: 'สินค้า', unit: 'ชิ้น' });

      expect(realPrisma.shopStaff.findFirst).not.toHaveBeenCalled();
      expect(realPrisma.product.create).toHaveBeenCalled();
    });

    it('บัญชีที่ถูกระงับใช้งานไม่ได้', async () => {
      realPrisma.user.findFirst.mockResolvedValue({
        id: STAFF,
        ownerId: OWNER,
        status: 'SUSPENDED',
      });

      await expect(
        staffService.create(STAFF, { name: 'สินค้า', unit: 'ชิ้น' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
