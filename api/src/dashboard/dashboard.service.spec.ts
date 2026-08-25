import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../database/prisma.service';
import type { AccountContextService } from '../common/access/account-context.service';
import { DashboardAccessService } from './dashboard-access.service';
import { DashboardService } from './dashboard.service';

const OWNER = '0199a0e0-0000-7000-8000-000000000001';
const STAFF = '0199a0e0-0000-7000-8000-0000000000ff';
const SHOP = '0199a0e0-0000-7000-8000-000000000010';

const OWNER_CTX = { userId: OWNER, ownerId: OWNER, isStaff: false };
const STAFF_CTX = { userId: STAFF, ownerId: OWNER, isStaff: true };

const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape);

const RANGE = {
  from: new Date('2026-07-25T00:00:00.000Z'),
  to: new Date('2026-08-24T00:00:00.000Z'),
};

function createPrismaMock() {
  return {
    sale: { aggregate: jest.fn() },
    saleItem: { groupBy: jest.fn() },
    shopProduct: {
      count: jest.fn(),
      findMany: jest.fn(),
      fields: { lowStockThreshold: 'lowStockThreshold' },
    },
    shopStaff: { findFirst: jest.fn(), findMany: jest.fn() },
    shop: { findMany: jest.fn() },
    subscription: { findUnique: jest.fn() },
  };
}

describe('DashboardService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let access: {
    assertCanViewShopDashboard: jest.Mock;
    assertCanViewAccountDashboard: jest.Mock;
    assertPaidPlan: jest.Mock;
    listVisibleShopIds: jest.Mock;
  };
  let service: DashboardService;

  beforeEach(() => {
    prisma = createPrismaMock();
    access = {
      assertCanViewShopDashboard: jest.fn().mockResolvedValue(OWNER_CTX),
      assertCanViewAccountDashboard: jest.fn().mockResolvedValue(OWNER_CTX),
      assertPaidPlan: jest.fn().mockResolvedValue(undefined),
      listVisibleShopIds: jest.fn().mockResolvedValue([SHOP]),
    };
    service = new DashboardService(
      prisma as unknown as PrismaService,
      access as unknown as DashboardAccessService,
    );
  });

  describe('getShopDashboard', () => {
    it('สรุปยอดขายและสต็อกของร้านเดียว', async () => {
      prisma.sale.aggregate.mockResolvedValue({
        _sum: { totalAmount: 1500 },
        _count: { _all: 6 },
      });
      prisma.shopProduct.count
        .mockResolvedValueOnce(42)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);

      const result = await service.getShopDashboard(OWNER, SHOP, RANGE);

      expect(result.sales).toEqual({
        totalAmount: 1500,
        saleCount: 6,
        averageSaleAmount: 250,
      });
      expect(result.stock).toEqual({
        activeProducts: 42,
        lowStock: 3,
        outOfStock: 1,
      });
    });

    it('ไม่มีบิลเลย averageSaleAmount ต้องเป็น 0 ไม่ใช่ NaN', async () => {
      prisma.sale.aggregate.mockResolvedValue({
        _sum: { totalAmount: null },
        _count: { _all: 0 },
      });
      prisma.shopProduct.count.mockResolvedValue(0);

      const result = await service.getShopDashboard(OWNER, SHOP, RANGE);

      expect(result.sales.averageSaleAmount).toBe(0);
      expect(result.sales.totalAmount).toBe(0);
    });

    it('นับเฉพาะบิลที่ COMPLETED ไม่นับบิลที่ถูกยกเลิก', async () => {
      prisma.sale.aggregate.mockResolvedValue({
        _sum: { totalAmount: 0 },
        _count: { _all: 0 },
      });
      prisma.shopProduct.count.mockResolvedValue(0);

      await service.getShopDashboard(OWNER, SHOP, RANGE);

      expect(prisma.sale.aggregate).toHaveBeenCalledWith(
        containing({ where: containing({ status: 'COMPLETED' }) }),
      );
    });

    it('แดชบอร์ดพื้นฐานไม่เช็คแพ็กเกจ Free ต้องเข้าได้', async () => {
      prisma.sale.aggregate.mockResolvedValue({
        _sum: { totalAmount: 0 },
        _count: { _all: 0 },
      });
      prisma.shopProduct.count.mockResolvedValue(0);

      await service.getShopDashboard(OWNER, SHOP, RANGE);

      expect(access.assertPaidPlan).not.toHaveBeenCalled();
    });
  });

  describe('getBestSellers', () => {
    it('จัดอันดับตามจำนวนที่ขายได้ และใช้ชื่อสินค้าที่ snapshot ไว้', async () => {
      prisma.saleItem.groupBy.mockResolvedValue([
        {
          shopProductId: 'sp1',
          productName: 'โค้ก 325ml',
          _sum: { quantity: 40, lineTotal: 600 },
        },
        {
          shopProductId: 'sp2',
          productName: 'น้ำเปล่า 600ml',
          _sum: { quantity: 12, lineTotal: 84 },
        },
      ]);

      const result = await service.getBestSellers(OWNER, SHOP, {
        ...RANGE,
        limit: 10,
      });

      expect(result.items).toEqual([
        {
          rank: 1,
          shopProductId: 'sp1',
          productName: 'โค้ก 325ml',
          quantitySold: 40,
          totalAmount: 600,
        },
        {
          rank: 2,
          shopProductId: 'sp2',
          productName: 'น้ำเปล่า 600ml',
          quantitySold: 12,
          totalAmount: 84,
        },
      ]);
    });

    it('ต้องเช็คแพ็กเกจก่อนเสมอ', async () => {
      prisma.saleItem.groupBy.mockResolvedValue([]);

      await service.getBestSellers(OWNER, SHOP, { ...RANGE, limit: 10 });

      expect(access.assertPaidPlan).toHaveBeenCalledWith(OWNER);
    });

    it('แพ็กเกจ Free ถูกปฏิเสธก่อนแตะฐานข้อมูล', async () => {
      access.assertPaidPlan.mockRejectedValue(new ForbiddenException());

      await expect(
        service.getBestSellers(OWNER, SHOP, { ...RANGE, limit: 10 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.saleItem.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('getDeadStock', () => {
    it('ตัดสินค้าที่เพิ่งขายออก และเรียงของที่ไม่เคยขายขึ้นก่อน', async () => {
      prisma.shopProduct.findMany.mockResolvedValue([
        { id: 'sp1', stockQty: 5, product: { name: 'ขายเมื่อวาน' } },
        { id: 'sp2', stockQty: 9, product: { name: 'ไม่เคยขาย' } },
        { id: 'sp3', stockQty: 2, product: { name: 'ขายนานแล้ว' } },
      ]);
      prisma.saleItem.groupBy
        .mockResolvedValueOnce([
          { shopProductId: 'sp1', _max: { createdAt: new Date() } },
        ])
        .mockResolvedValueOnce([
          {
            shopProductId: 'sp3',
            _max: { createdAt: new Date(Date.now() - 90 * 86_400_000) },
          },
        ]);

      const result = await service.getDeadStock(OWNER, SHOP, { days: 30 });

      expect(result.items.map((item) => item.shopProductId)).toEqual([
        'sp2',
        'sp3',
      ]);
      expect(result.items[0].lastSoldAt).toBeNull();
      expect(result.items[0].daysSinceLastSale).toBeNull();
      expect(result.items[1].daysSinceLastSale).toBeGreaterThanOrEqual(89);
    });

    it('ร้านที่ไม่มีสินค้าคงเหลือคืนลิสต์ว่าง ไม่ยิง query ต่อ', async () => {
      prisma.shopProduct.findMany.mockResolvedValue([]);

      const result = await service.getDeadStock(OWNER, SHOP, { days: 30 });

      expect(result).toEqual({ days: 30, items: [] });
      expect(prisma.saleItem.groupBy).not.toHaveBeenCalled();
    });

    it('ต้องเช็คแพ็กเกจก่อนเสมอ', async () => {
      prisma.shopProduct.findMany.mockResolvedValue([]);

      await service.getDeadStock(OWNER, SHOP, { days: 30 });

      expect(access.assertPaidPlan).toHaveBeenCalledWith(OWNER);
    });
  });
});

describe('DashboardAccessService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let shopAccess: {
    assertCanViewShopProducts: jest.Mock;
    assertCanManageShopProducts: jest.Mock;
  };
  let accountContext: { resolve: jest.Mock };
  let access: DashboardAccessService;

  beforeEach(() => {
    prisma = createPrismaMock();
    shopAccess = {
      assertCanViewShopProducts: jest.fn().mockResolvedValue(OWNER_CTX),
      assertCanManageShopProducts: jest.fn().mockResolvedValue(OWNER_CTX),
    };
    accountContext = { resolve: jest.fn().mockResolvedValue(OWNER_CTX) };
    access = new DashboardAccessService(
      prisma as unknown as PrismaService,
      accountContext as unknown as AccountContextService,
      shopAccess,
    );
  });

  it('เจ้าของร้านไม่ต้องมี canViewDashboard', async () => {
    await expect(
      access.assertCanViewShopDashboard(OWNER, SHOP),
    ).resolves.toEqual(OWNER_CTX);
    expect(prisma.shopStaff.findFirst).not.toHaveBeenCalled();
  });

  it('พนักงานที่ไม่มี canViewDashboard -> 403', async () => {
    shopAccess.assertCanViewShopProducts.mockResolvedValue(STAFF_CTX);
    prisma.shopStaff.findFirst.mockResolvedValue(null);

    await expect(
      access.assertCanViewShopDashboard(STAFF, SHOP),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('พนักงานที่ได้รับสิทธิ์แล้วผ่าน', async () => {
    shopAccess.assertCanViewShopProducts.mockResolvedValue(STAFF_CTX);
    prisma.shopStaff.findFirst.mockResolvedValue({ id: 'assignment-1' });

    await expect(
      access.assertCanViewShopDashboard(STAFF, SHOP),
    ).resolves.toEqual(STAFF_CTX);
  });

  it('แพ็กเกจ Free โดน 403 พร้อมโค้ดให้หน้าเว็บชวนอัปเกรด', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      plan: { isFree: true },
    });

    await expect(access.assertPaidPlan(OWNER)).rejects.toMatchObject({
      response: { code: 'PLAN_UPGRADE_REQUIRED', requiredPlan: 'PLUS' },
    });
  });

  it('บัญชีที่ยังไม่มี subscription นับเป็น Free', async () => {
    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(access.assertPaidPlan(OWNER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('แพ็กเกจแบบจ่ายเงินผ่าน', async () => {
    prisma.subscription.findUnique.mockResolvedValue({
      plan: { isFree: false },
    });

    await expect(access.assertPaidPlan(OWNER)).resolves.toBeUndefined();
  });

  it('พนักงานเห็นเฉพาะร้านที่ถูก assign และเปิดสิทธิ์ดูแดชบอร์ด', async () => {
    prisma.shopStaff.findMany.mockResolvedValue([
      { shopId: 'shop-a' },
      { shopId: 'shop-b' },
    ]);

    await expect(access.listVisibleShopIds(STAFF_CTX)).resolves.toEqual([
      'shop-a',
      'shop-b',
    ]);
    expect(prisma.shop.findMany).not.toHaveBeenCalled();
  });

  it('เจ้าของร้านเห็นทุกร้านที่ยังไม่ถูกลบและไม่ถูกระงับ', async () => {
    prisma.shop.findMany.mockResolvedValue([{ id: 'shop-a' }]);

    await expect(access.listVisibleShopIds(OWNER_CTX)).resolves.toEqual([
      'shop-a',
    ]);
    expect(prisma.shopStaff.findMany).not.toHaveBeenCalled();
  });
});
