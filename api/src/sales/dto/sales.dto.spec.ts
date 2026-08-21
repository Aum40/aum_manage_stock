import {
  createSaleSchema,
  saleQuerySchema,
  scanSaleSchema,
  voidSaleSchema,
} from './sales.dto';

describe('sales DTO schemas', () => {
  it('accepts valid payloads and applies pagination defaults', () => {
    expect(scanSaleSchema.parse({ barcode: ' 885123 ' }).barcode).toBe(
      '885123',
    );
    expect(
      createSaleSchema.parse({
        items: [
          {
            shopProductId: '11111111-1111-4111-8111-111111111111',
            quantity: 2,
          },
        ],
      }).items,
    ).toHaveLength(1);
    expect(saleQuerySchema.parse({})).toEqual({ limit: 20 });
    expect(voidSaleSchema.parse({ reason: ' wrong item ' }).reason).toBe(
      'wrong item',
    );
  });

  it('rejects empty sales and invalid void reasons', () => {
    expect(createSaleSchema.safeParse({ items: [] }).success).toBe(false);
    expect(voidSaleSchema.safeParse({ reason: ' ' }).success).toBe(false);
  });
});
