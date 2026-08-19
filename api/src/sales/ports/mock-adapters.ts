import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma-client/client';
import { SalesStaffPort, SalesSubscriptionPort } from './sales-access.port';
import { SalesProductPort, SellableProduct } from './sales-product.port';

export const SALES_MOCK_SHOP_ID = '10000000-0000-4000-8000-000000000001';
export const SALES_MOCK_STAFF_ID = '20000000-0000-4000-8000-000000000001';

const fixtures = [
  {
    shopProductId: '30000000-0000-4000-8000-000000000001',
    barcode: '8850000000011',
    name: 'Americano',
    unitPrice: '60.00',
    quantity: 20,
  },
  {
    shopProductId: '30000000-0000-4000-8000-000000000002',
    barcode: '8850000000028',
    name: 'Cafe Latte',
    unitPrice: '75.00',
    quantity: 15,
  },
  {
    shopProductId: '30000000-0000-4000-8000-000000000003',
    barcode: '8850000000035',
    name: 'Butter Croissant',
    unitPrice: '55.00',
    quantity: 10,
  },
] as const;

@Injectable()
export class MockSalesProductAdapter implements SalesProductPort {
  private readonly quantities = new Map<string, number>(
    fixtures.map((item) => [item.shopProductId, item.quantity]),
  );

  scan(shopId: string, barcode: string) {
    const product = this.find(shopId, (item) => item.barcode === barcode);
    return Promise.resolve({
      ...this.snapshot(product),
      barcode: product.barcode,
      quantity: this.quantities.get(product.shopProductId) ?? 0,
    });
  }

  getForSale(
    _tx: Prisma.TransactionClient,
    shopId: string,
    shopProductId: string,
  ) {
    void _tx;
    return Promise.resolve(
      this.snapshot(
        this.find(shopId, (item) => item.shopProductId === shopProductId),
      ),
    );
  }

  adjustStock(
    _tx: Prisma.TransactionClient,
    input: { shopId: string; shopProductId: string; quantityDelta: number },
  ) {
    void _tx;
    const product = this.find(
      input.shopId,
      (item) => item.shopProductId === input.shopProductId,
    );
    const quantityBefore = this.quantities.get(product.shopProductId) ?? 0;
    const quantityAfter = quantityBefore + input.quantityDelta;
    if (quantityAfter < 0)
      throw new ConflictException(`Insufficient stock for ${product.name}`);
    this.quantities.set(product.shopProductId, quantityAfter);
    return Promise.resolve({ quantityBefore, quantityAfter });
  }

  private find(
    shopId: string,
    predicate: (item: (typeof fixtures)[number]) => boolean,
  ) {
    if (shopId !== SALES_MOCK_SHOP_ID)
      throw new NotFoundException('Mock shop not found');
    const product = fixtures.find(predicate);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private snapshot(product: (typeof fixtures)[number]): SellableProduct {
    return {
      shopProductId: product.shopProductId,
      name: product.name,
      unitPrice: new Prisma.Decimal(product.unitPrice),
    };
  }
}

@Injectable()
export class MockSalesStaffAdapter implements SalesStaffPort {
  assertCanManageSales(
    _tx: Prisma.TransactionClient,
    input: { shopId: string; staffId: string },
  ) {
    void _tx;
    if (
      input.shopId !== SALES_MOCK_SHOP_ID ||
      input.staffId !== SALES_MOCK_STAFF_ID
    )
      throw new ForbiddenException('Mock staff cannot access this shop');
    return Promise.resolve();
  }
}

@Injectable()
export class MockSalesSubscriptionAdapter implements SalesSubscriptionPort {
  assertSalesEnabled(_tx: Prisma.TransactionClient, shopId: string) {
    void _tx;
    if (shopId !== SALES_MOCK_SHOP_ID)
      throw new ForbiddenException('Mock sales subscription is not active');
    return Promise.resolve();
  }
}
