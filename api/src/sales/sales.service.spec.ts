import { Prisma } from '../database/generated/prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  const productId = '11111111-1111-4111-8111-111111111111';
  const saleId = '22222222-2222-4222-8222-222222222222';
  const itemId = '33333333-3333-4333-8333-333333333333';

  function setup(saleOverrides: Record<string, unknown> = {}) {
    const sale = {
      id: saleId,
      status: 'COMPLETED',
      items: [{ id: itemId, shopProductId: productId, quantity: 2 }],
      ...saleOverrides,
    };
    const tx = {
      sale: {
        create: jest
          .fn()
          .mockResolvedValue({ ...sale, totalAmount: new Prisma.Decimal(25) }),
        findFirst: jest.fn().mockResolvedValue(sale),
        findMany: jest.fn().mockResolvedValue([sale]),
        update: jest.fn().mockResolvedValue({ ...sale, status: 'VOIDED' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(tx),
      ),
    };
    const movements = { create: jest.fn().mockResolvedValue({}) };
    const products = {
      getForSale: jest.fn().mockResolvedValue({
        shopProductId: productId,
        name: 'Coffee',
        barcode: '8850000000001',
        unitPrice: new Prisma.Decimal('12.50'),
        costPrice: new Prisma.Decimal('8.00'),
      }),
      adjustStock: jest
        .fn()
        .mockResolvedValue({ quantityBefore: 10, quantityAfter: 8 }),
      scan: jest.fn().mockResolvedValue({
        shopProductId: productId,
        name: 'Coffee',
        barcode: '8850000000001',
        unitPrice: new Prisma.Decimal('12.50'),
        costPrice: new Prisma.Decimal('8.00'),
      }),
    };
    const staff = {
      assertCanManageSales: jest.fn().mockResolvedValue(undefined),
    };
    const subscriptions = {
      assertSalesEnabled: jest.fn().mockResolvedValue(undefined),
      assertBarcodeEnabled: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SalesService(
      prisma as never,
      movements as never,
      products,
      staff,
      subscriptions,
    );
    return { service, tx, movements, products, staff, subscriptions };
  }

  it('creates sale, decreases stock, and records movement in one transaction', async () => {
    const { service, tx, movements, products } = setup();
    await service.create('shop', 'staff', {
      items: [{ shopProductId: productId, quantity: 2 }],
    });
    expect(tx.sale.create).toHaveBeenCalled();
    const [createCall] = tx.sale.create.mock.calls as unknown as [
      [
        {
          data: {
            totalAmount: Prisma.Decimal;
            saleNo: string;
            itemCount: number;
            items: {
              create: Array<{ barcode: string; costPrice: Prisma.Decimal }>;
            };
          };
        },
      ],
    ];
    expect(createCall[0].data.totalAmount.toString()).toBe('25');
    expect(createCall[0].data.saleNo).toMatch(/^S-[A-F0-9]{20}$/);
    expect(createCall[0].data.itemCount).toBe(2);
    expect(createCall[0].data.items.create[0]).toMatchObject({
      barcode: '8850000000001',
      costPrice: new Prisma.Decimal('8.00'),
    });
    expect(products.adjustStock).toHaveBeenCalledWith(tx, {
      shopId: 'shop',
      shopProductId: productId,
      quantityDelta: -2,
    });
    expect(movements.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        movementType: 'SALE',
        saleId,
        referenceId: itemId,
      }),
    );
  });

  it('voids sale, restores stock, and records reversal movement', async () => {
    const { service, tx, movements, products } = setup();
    await service.void('shop', 'staff', saleId, 'mistake');
    expect(products.adjustStock).toHaveBeenCalledWith(tx, {
      shopId: 'shop',
      shopProductId: productId,
      quantityDelta: 2,
    });
    expect(movements.create).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        movementType: 'SALE_VOID',
        saleId,
        referenceId: itemId,
      }),
    );
    expect(tx.sale.update).toHaveBeenCalled();
    const [updateCall] = tx.sale.update.mock.calls as unknown as [
      [{ data: { status: string } }],
    ];
    expect(updateCall[0].data.status).toBe('VOIDED');
  });

  it('rejects an already voided sale before changing stock', async () => {
    const { service, products, movements } = setup({ status: 'VOIDED' });
    await expect(
      service.void('shop', 'staff', saleId, 'again'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(products.adjustStock).not.toHaveBeenCalled();
    expect(movements.create).not.toHaveBeenCalled();
  });

  it('fails before product access when authorization is unavailable', async () => {
    const { service, staff, products } = setup();
    staff.assertCanManageSales.mockRejectedValue(new Error('unavailable'));
    await expect(
      service.create('shop', 'staff', {
        items: [{ shopProductId: productId, quantity: 1 }],
      }),
    ).rejects.toThrow('unavailable');
    expect(products.getForSale).not.toHaveBeenCalled();
  });

  it('scans only after staff and subscription checks', async () => {
    const { service, tx, staff, subscriptions, products } = setup();
    await expect(
      service.scan('shop', 'staff', '885123'),
    ).resolves.toMatchObject({ shopProductId: productId });
    expect(staff.assertCanManageSales).toHaveBeenCalledWith(tx, {
      shopId: 'shop',
      staffId: 'staff',
    });
    expect(subscriptions.assertBarcodeEnabled).toHaveBeenCalledWith(tx, 'shop');
    expect(products.scan).toHaveBeenCalledWith('shop', '885123');
  });

  it('lists sales with cursor metadata', async () => {
    const { service } = setup();
    await expect(
      service.list('shop', 'staff', { limit: 20 }),
    ).resolves.toMatchObject({ items: [{ id: saleId }], nextCursor: null });
  });

  it('returns a shop-scoped sale detail', async () => {
    const { service, tx } = setup();
    await expect(service.get('shop', 'staff', saleId)).resolves.toMatchObject({
      id: saleId,
    });
    expect(tx.sale.findFirst).toHaveBeenCalledWith({
      where: { id: saleId, shopId: 'shop' },
      include: { items: true },
    });
  });

  it('returns not found without changing stock when a sale is absent', async () => {
    const { service, tx, products, movements } = setup();
    tx.sale.findFirst.mockResolvedValue(null);
    await expect(
      service.void('shop', 'staff', saleId, 'mistake'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(products.adjustStock).not.toHaveBeenCalled();
    expect(movements.create).not.toHaveBeenCalled();
  });

  it('fails before product access when the subscription check fails', async () => {
    const { service, subscriptions, products } = setup();
    subscriptions.assertBarcodeEnabled.mockRejectedValue(
      new Error('unavailable'),
    );
    await expect(
      service.create('shop', 'staff', {
        items: [{ shopProductId: productId, quantity: 1 }],
      }),
    ).rejects.toThrow('unavailable');
    expect(products.getForSale).not.toHaveBeenCalled();
  });
});
