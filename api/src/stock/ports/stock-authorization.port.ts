import { Prisma } from '@prisma/client';

export const STOCK_AUTHORIZATION_PORT = Symbol('STOCK_AUTHORIZATION_PORT');

export interface StockAuthorizationPort {
  assertCanAdjustStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; actorId: string },
  ): Promise<void>;
}
