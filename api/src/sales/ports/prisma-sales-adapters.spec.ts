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

  it('blocks sales management for a paused shop, even for the owner', async () => {
    const tx = {
      shop: {
        findFirst: jest.fn().mockResolvedValue({
          ownerId: 'owner',
          pausedAt: new Date('2026-08-27T00:00:00.000Z'),
        }),
      },
      shopStaff: { findFirst: jest.fn() },
    };
    const adapter = new PrismaSalesStaffAdapter();

    await expect(
      adapter.assertCanManageSales(tx as never, {
        shopId: 'shop',
        staffId: 'owner',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      adapter.assertCanManageSales(tx as never, {
        shopId: 'shop',
        staffId: 'staff',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.shopStaff.findFirst).not.toHaveBeenCalled();
  });

  it('uses server-side product snapshot values', async () => {
    const tx = {
      shopProduct: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'product',
          sellPrice: new Prisma.Decimal('75.00'),
          costPrice: new Prisma.Decimal('40.00'),
          product: { name: 'Latte', barcode: '8850000000001' },
        }),
      },
    };
    const adapter = new PrismaSalesProductAdapter({} as never, {} as never);
    await expect(
      adapter.getForSale(tx as never, 'shop', 'product'),
    ).resolves.toMatchObject({
      shopProductId: 'product',
      name: 'Latte',
      barcode: '8850000000001',
      unitPrice: new Prisma.Decimal('75.00'),
      costPrice: new Prisma.Decimal('40.00'),
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

  it('allows barcode only when the active plan enables it', async () => {
    const tx = {
      shop: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            owner: {
              subscription: {
                status: 'ACTIVE',
                expiresAt: null,
                plan: { barcodeEnabled: true },
              },
            },
          })
          .mockResolvedValueOnce({
            owner: {
              subscription: {
                status: 'ACTIVE',
                expiresAt: null,
                plan: { barcodeEnabled: false },
              },
            },
          }),
      },
    };
    const adapter = new PrismaSalesSubscriptionAdapter();
    await expect(
      adapter.assertBarcodeEnabled(tx as never, 'shop'),
    ).resolves.toBeUndefined();
    await expect(
      adapter.assertBarcodeEnabled(tx as never, 'shop'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
