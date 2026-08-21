import { UnauthorizedException } from '@nestjs/common';
import { SalesController } from './sales.controller';

describe('SalesController', () => {
  const shopId = '11111111-1111-4111-8111-111111111111';
  const staffId = '22222222-2222-4222-8222-222222222222';
  const saleId = '33333333-3333-4333-8333-333333333333';

  function setup() {
    const sales = {
      scan: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      list: jest.fn().mockResolvedValue({ items: [], nextCursor: null }),
      get: jest.fn().mockResolvedValue({}),
      void: jest.fn().mockResolvedValue({}),
    };
    return { controller: new SalesController(sales as never), sales };
  }

  it('forwards all endpoints with the authenticated staff id', async () => {
    const { controller, sales } = setup();
    await controller.scan(shopId, staffId, { barcode: '885123' });
    await controller.create(shopId, staffId, {
      items: [{ shopProductId: saleId, quantity: 1 }],
    });
    await controller.list(shopId, staffId, { limit: 20 });
    await controller.get(shopId, saleId, staffId);
    await controller.void(shopId, saleId, staffId, { reason: 'mistake' });
    expect(sales.scan).toHaveBeenCalledWith(shopId, staffId, '885123');
    expect(sales.create).toHaveBeenCalledWith(
      shopId,
      staffId,
      expect.any(Object),
    );
    expect(sales.list).toHaveBeenCalledWith(shopId, staffId, { limit: 20 });
    expect(sales.get).toHaveBeenCalledWith(shopId, staffId, saleId);
    expect(sales.void).toHaveBeenCalledWith(shopId, staffId, saleId, 'mistake');
  });

  it.each([undefined, 'not-a-uuid'])(
    'rejects missing or invalid staff header: %s',
    (value) => {
      const { controller, sales } = setup();
      expect(() =>
        controller.scan(shopId, value, { barcode: '885123' }),
      ).toThrow(UnauthorizedException);
      expect(sales.scan).not.toHaveBeenCalled();
    },
  );
});
