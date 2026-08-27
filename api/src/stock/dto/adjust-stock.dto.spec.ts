import { adjustStockSchema } from './adjust-stock.dto';

describe('adjustStockSchema', () => {
  it('accepts a positive integer quantity', () => {
    expect(
      adjustStockSchema.safeParse({
        shopProductId: '9a451d41-2cf8-42e5-bff3-0bcf107e423f',
        operation: 'INCREASE',
        quantity: 10,
      }).success,
    ).toBe(true);
  });

  it.each([0, -1, 1.5])('rejects invalid quantity %s', (quantity) => {
    expect(
      adjustStockSchema.safeParse({
        shopProductId: '9a451d41-2cf8-42e5-bff3-0bcf107e423f',
        operation: 'INCREASE',
        quantity,
      }).success,
    ).toBe(false);
  });
});
