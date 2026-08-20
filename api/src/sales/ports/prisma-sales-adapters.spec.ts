import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../database/generated/prisma/client';
import {
  PrismaSalesProductAdapter,
  PrismaSalesStaffAdapter,
  PrismaSalesSubscriptionAdapter,
} from './prisma-sales-adapters';

describe('Prisma sales adapters', () => {
  it('allows the owner and staff with canScanSale', async () => {
    const tx = {
      shop: {
        findFirst: jest.fn().mockResolvedValue({ ownerId: 'owner' }),
      },
      shopStaff: {
        findFirst: jest.fn().mockResolvedValue({ id: 'assignment' }),
      },
    };
    const adapter = new PrismaSalesStaffAdapter();
    await expect(
      adapter.assertCanManageSales(tx as never, {
        shopId: 'shop',
        staffId: 'owner',
      }),
    ).resolves.toBeUndefined();
    await expect(
      adapter.assertCanManageSales(tx as never, {
        shopId: 'shop',
        staffId: 'staff',
      }),
    ).resolves.toBeUndefined();
    const [staffCall] = tx.shopStaff.findFirst.mock.calls as unknown as [
      [{ where: { permission: { canScanSale: boolean } } }],
    ];
    expect(staffCall[0].where.permission.canScanSale).toBe(true);
  });

  it('fails closed when sales permission is missing', async () => {
    const tx = {
      shop: {
        findFirst: jest.fn().mockResolvedValue({ ownerId: 'owner' }),
      },
      shopStaff: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    await expect(
      new PrismaSalesStaffAdapter().assertCanManageSales(tx as never, {
        shopId: 'shop',
        staffId: 'staff',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses the server-side product name and selling price', async () => {
    const tx = {
      shopProduct: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'product',
          sellPrice: new Prisma.Decimal('75.00'),
          product: { name: 'Latte' },
        }),
      },
    };
    const adapter = new PrismaSalesProductAdapter({} as never, {} as never);
    await expect(
      adapter.getForSale(tx as never, 'shop', 'product'),
    ).resolves.toMatchObject({
      shopProductId: 'product',
      name: 'Latte',
      unitPrice: new Prisma.Decimal('75.00'),
    });
  });

  it('rejects an inactive or cross-shop product', async () => {
    const tx = {
      shopProduct: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const adapter = new PrismaSalesProductAdapter({} as never, {} as never);
    await expect(
      adapter.getForSale(tx as never, 'shop', 'product'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows an active subscription and blocks a read-only subscription', async () => {
    const tx = {
      shop: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            owner: { subscription: { status: 'ACTIVE', expiresAt: null } },
          })
          .mockResolvedValueOnce({
            owner: {
              subscription: {
                status: 'CANCELLED',
                expiresAt: new Date('2099-01-01'),
              },
            },
          }),
      },
    };
    const adapter = new PrismaSalesSubscriptionAdapter();
    await expect(
      adapter.assertSalesEnabled(tx as never, 'shop'),
    ).resolves.toBeUndefined();
    await expect(
      adapter.assertSalesEnabled(tx as never, 'shop'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
