import { Prisma } from '@prisma/client';

export const SALES_PRODUCT_PORT = Symbol('SALES_PRODUCT_PORT');
export interface SellableProduct {
  shopProductId: string;
  name: string;
  unitPrice: Prisma.Decimal;
}
export interface SalesProductPort {
  scan(shopId: string, barcode: string): Promise<SellableProduct>;
  getForSale(
    tx: Prisma.TransactionClient,
    shopId: string,
    shopProductId: string,
  ): Promise<SellableProduct>;
  adjustStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; shopProductId: string; quantityDelta: number },
  ): Promise<{ quantityBefore: number; quantityAfter: number }>;
}
