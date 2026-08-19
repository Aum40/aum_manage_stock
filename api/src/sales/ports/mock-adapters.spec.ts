import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  MockSalesProductAdapter,
  MockSalesStaffAdapter,
  MockSalesSubscriptionAdapter,
  SALES_MOCK_SHOP_ID,
  SALES_MOCK_STAFF_ID,
} from './mock-adapters';

describe('sales mock adapters', () => {
  it('scans fixtures and tracks stock changes in memory', async () => {
    const products = new MockSalesProductAdapter();
    await expect(
      products.scan(SALES_MOCK_SHOP_ID, '8850000000011'),
    ).resolves.toMatchObject({ name: 'Americano', quantity: 20 });
    await expect(
      products.adjustStock(
        {},
        {
          shopId: SALES_MOCK_SHOP_ID,
          shopProductId: '30000000-0000-4000-8000-000000000001',
          quantityDelta: -2,
        },
      ),
    ).resolves.toEqual({ quantityBefore: 20, quantityAfter: 18 });
    await expect(
      products.scan(SALES_MOCK_SHOP_ID, '8850000000011'),
    ).resolves.toMatchObject({ quantity: 18 });
  });

  it('rejects unknown products and insufficient stock', () => {
    const products = new MockSalesProductAdapter();
    expect(() => products.scan(SALES_MOCK_SHOP_ID, 'unknown')).toThrow(
      NotFoundException,
    );
    expect(() =>
      products.adjustStock(
        {},
        {
          shopId: SALES_MOCK_SHOP_ID,
          shopProductId: '30000000-0000-4000-8000-000000000003',
          quantityDelta: -11,
        },
      ),
    ).toThrow(ConflictException);
  });

  it('allows only the documented mock shop and staff', async () => {
    const staff = new MockSalesStaffAdapter();
    const subscriptions = new MockSalesSubscriptionAdapter();
    await expect(
      staff.assertCanManageSales(
        {},
        {
          shopId: SALES_MOCK_SHOP_ID,
          staffId: SALES_MOCK_STAFF_ID,
        },
      ),
    ).resolves.toBeUndefined();
    await expect(
      subscriptions.assertSalesEnabled({}, SALES_MOCK_SHOP_ID),
    ).resolves.toBeUndefined();
    expect(() =>
      staff.assertCanManageSales(
        {},
        {
          shopId: SALES_MOCK_SHOP_ID,
          staffId: 'wrong',
        },
      ),
    ).toThrow(ForbiddenException);
  });
});
