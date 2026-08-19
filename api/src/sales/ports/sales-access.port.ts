import { Prisma } from '../../generated/prisma-client/client';

export const SALES_STAFF_PORT = Symbol('SALES_STAFF_PORT');
export const SALES_SUBSCRIPTION_PORT = Symbol('SALES_SUBSCRIPTION_PORT');
export interface SalesStaffPort {
  assertCanManageSales(
    tx: Prisma.TransactionClient,
    input: { shopId: string; staffId: string },
  ): Promise<void>;
}
export interface SalesSubscriptionPort {
  assertSalesEnabled(
    tx: Prisma.TransactionClient,
    shopId: string,
  ): Promise<void>;
}
