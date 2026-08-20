import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaStockInventoryAdapter } from './prisma-stock-inventory.adapter';

describe('PrismaStockInventoryAdapter', () => {
  it('decrements stock atomically and returns before/after quantities', async () => {
    const tx = {
      shopProduct: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ stockQty: 7 }),
      },
    };
    const adapter = new PrismaStockInventoryAdapter({} as never);
    await expect(
      adapter.adjustStock(tx as never, {
        shopId: 'shop',
        shopProductId: 'product',
        quantityDelta: -3,
      }),
    ).resolves.toEqual({ quantityBefore: 10, quantityAfter: 7 });
    expect(tx.shopProduct.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'product',
        shopId: 'shop',
        status: 'ACTIVE',
        stockQty: { gte: 3 },
      },
      data: { stockQty: { increment: -3 } },
    });
  });

  it('rejects insufficient stock without updating a row', async () => {
    const tx = {
      shopProduct: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue({ id: 'product' }),
      },
    };
    const adapter = new PrismaStockInventoryAdapter({} as never);
    await expect(
      adapter.adjustStock(tx as never, {
        shopId: 'shop',
        shopProductId: 'product',
        quantityDelta: -3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a product outside the shop', async () => {
    const tx = {
      shopProduct: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const adapter = new PrismaStockInventoryAdapter({} as never);
    await expect(
      adapter.adjustStock(tx as never, {
        shopId: 'shop',
        shopProductId: 'other-product',
        quantityDelta: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
