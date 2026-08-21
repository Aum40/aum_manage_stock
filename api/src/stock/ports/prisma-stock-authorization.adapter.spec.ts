import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaStockAuthorizationAdapter } from './prisma-stock-authorization.adapter';

describe('PrismaStockAuthorizationAdapter', () => {
  const activeShop = {
    ownerId: 'owner',
    owner: { subscription: { status: 'ACTIVE', expiresAt: null } },
  };

  it('allows the owner and permitted active staff', async () => {
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue(activeShop) },
      shopStaff: {
        findFirst: jest.fn().mockResolvedValue({ id: 'assignment' }),
      },
    };
    const adapter = new PrismaStockAuthorizationAdapter();
    await expect(
      adapter.assertCanAdjustStock(tx as never, {
        shopId: 'shop',
        actorId: 'owner',
      }),
    ).resolves.toBeUndefined();
    expect(tx.shopStaff.findFirst).not.toHaveBeenCalled();
    await expect(
      adapter.assertCanAdjustStock(tx as never, {
        shopId: 'shop',
        actorId: 'staff',
      }),
    ).resolves.toBeUndefined();
    const [staffCall] = tx.shopStaff.findFirst.mock.calls as unknown as [
      [{ where: { permission: { canAdjustStockManual: boolean } } }],
    ];
    expect(staffCall[0].where.permission.canAdjustStockManual).toBe(true);
  });

  it('fails closed for missing permission or shop', async () => {
    const adapter = new PrismaStockAuthorizationAdapter();
    const tx = {
      shop: { findFirst: jest.fn().mockResolvedValue(activeShop) },
      shopStaff: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      adapter.assertCanAdjustStock(tx as never, {
        shopId: 'shop',
        actorId: 'staff',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    tx.shop.findFirst.mockResolvedValue(null);
    await expect(
      adapter.assertCanAdjustStock(tx as never, {
        shopId: 'shop',
        actorId: 'staff',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
