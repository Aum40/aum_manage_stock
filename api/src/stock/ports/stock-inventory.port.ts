import { Prisma } from '../../database/generated/prisma/client';

export const STOCK_INVENTORY_PORT = Symbol('STOCK_INVENTORY_PORT');

export interface StockSnapshot {
  shopProductId: string;
  quantity: number;
}

export interface StockInventoryPort {
  resolveProduct(
    shopId: string,
    productQuery: string,
  ): Promise<{ shopProductId: string }>;
  adjustStock(
    tx: Prisma.TransactionClient,
    input: {
      shopId: string;
      shopProductId: string;
      quantityDelta: number;
    },
  ): Promise<{ quantityBefore: number; quantityAfter: number }>;
}
