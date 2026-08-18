import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { StockAuthorizationPort } from './stock-authorization.port';
import { StockInventoryPort } from './stock-inventory.port';

@Injectable()
export class UnavailableStockInventoryAdapter implements StockInventoryPort {
  resolveProduct(): Promise<{ shopProductId: string }> {
    throw new ServiceUnavailableException(
      'ShopProduct integration is not available yet',
    );
  }

  adjustStock(
    _tx: Prisma.TransactionClient,
    _input: {
      shopId: string;
      shopProductId: string;
      quantityDelta: number;
    },
  ): Promise<{ quantityBefore: number; quantityAfter: number }> {
    void _tx;
    void _input;
    throw new ServiceUnavailableException(
      'ShopProduct integration is not available yet',
    );
  }
}

@Injectable()
export class UnavailableStockAuthorizationAdapter implements StockAuthorizationPort {
  assertCanAdjustStock(): Promise<void> {
    // Deliberately fail closed. Replace this adapter when staff-resource is ready.
    throw new ServiceUnavailableException(
      'Staff authorization integration is not available yet',
    );
  }
}
