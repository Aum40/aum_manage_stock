import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { PrismaService } from '../database/prisma.service';
import type { StockAuthorizationPort } from './ports/stock-authorization.port';
import type { StockInventoryPort } from './ports/stock-inventory.port';
import { StockService } from './stock.service';

describe('StockService', () => {
  it('authorizes, updates inventory, and records movement in one transaction', async () => {
    const tx = {};
    const prisma = {
      $transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const authorizeMock = jest.fn().mockResolvedValue(undefined);
    const authorization = {
      assertCanAdjustStock: authorizeMock,
    } as StockAuthorizationPort;
    const adjustMock = jest
      .fn()
      .mockResolvedValue({ quantityBefore: 10, quantityAfter: 15 });
    const inventory = {
      adjustStock: adjustMock,
    } as unknown as StockInventoryPort;
    const createMovementMock = jest
      .fn()
      .mockResolvedValue({ id: 'movement-id' });
    const movements = {
      create: createMovementMock,
    } as unknown as StockMovementsService;
    const service = new StockService(
      prisma,
      movements,
      inventory,
      authorization,
    );

    await expect(
      service.adjust({
        shopId: 'shop-id',
        shopProductId: 'product-id',
        actorId: 'actor-id',
        operation: 'INCREASE',
        quantity: 5,
        source: 'WEB',
      }),
    ).resolves.toMatchObject({ stock: { quantityAfter: 15 } });

    expect(authorizeMock).toHaveBeenCalledWith(tx, {
      shopId: 'shop-id',
      actorId: 'actor-id',
    });
    expect(adjustMock).toHaveBeenCalledWith(tx, {
      shopId: 'shop-id',
      shopProductId: 'product-id',
      quantityDelta: 5,
    });
    expect(createMovementMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        quantityBefore: 10,
        quantityAfter: 15,
        quantityDelta: 5,
      }),
    );
  });

  it('does not update inventory when authorization fails', async () => {
    const denied = new Error('denied');
    const tx = {};
    const prisma = {
      $transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const authorizeMock = jest.fn().mockRejectedValue(denied);
    const authorization = {
      assertCanAdjustStock: authorizeMock,
    } as StockAuthorizationPort;
    const adjustMock = jest.fn();
    const inventory = {
      adjustStock: adjustMock,
    } as unknown as StockInventoryPort;
    const createMovementMock = jest.fn();
    const movements = {
      create: createMovementMock,
    } as unknown as StockMovementsService;
    const service = new StockService(
      prisma,
      movements,
      inventory,
      authorization,
    );

    await expect(
      service.adjust({
        shopId: 'shop-id',
        shopProductId: 'product-id',
        actorId: 'actor-id',
        operation: 'DECREASE',
        quantity: 2,
        source: 'WEB',
      }),
    ).rejects.toBe(denied);
    expect(adjustMock).not.toHaveBeenCalled();
    expect(createMovementMock).not.toHaveBeenCalled();
  });
});
