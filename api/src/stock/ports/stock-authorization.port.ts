import { Prisma } from '../../database/generated/prisma/client';

export const STOCK_AUTHORIZATION_PORT = Symbol('STOCK_AUTHORIZATION_PORT');

export interface StockAuthorizationPort {
  assertCanViewStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; actorId: string },
  ): Promise<void>;
  assertCanAdjustStock(
    tx: Prisma.TransactionClient,
    input: { shopId: string; actorId: string },
  ): Promise<void>;
  assertCanUseChatbot(
    tx: Prisma.TransactionClient,
    input: { shopId: string; actorId: string },
  ): Promise<void>;
}
