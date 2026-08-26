import { Inject, Injectable } from '@nestjs/common';
import {
  PendingAction,
  Prisma,
  StockMovementSource,
} from '../database/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { STOCK_AUTHORIZATION_PORT } from './ports/stock-authorization.port';
import type { StockAuthorizationPort } from './ports/stock-authorization.port';
import { STOCK_INVENTORY_PORT } from './ports/stock-inventory.port';
import type { StockInventoryPort } from './ports/stock-inventory.port';

export interface ExecuteAdjustmentInput {
  shopId: string;
  shopProductId: string;
  actorId: string;
  operation: 'INCREASE' | 'DECREASE';
  quantity: number;
  source: StockMovementSource;
  note?: string;
  pendingAction?: PendingAction;
  pendingItemReferenceId?: string;
}

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movements: StockMovementsService,
    @Inject(STOCK_INVENTORY_PORT)
    private readonly inventory: StockInventoryPort,
    @Inject(STOCK_AUTHORIZATION_PORT)
    private readonly authorization: StockAuthorizationPort,
  ) {}

  adjust(input: ExecuteAdjustmentInput) {
    return this.prisma.$transaction(
      async (tx) => this.adjustInTransaction(tx, input),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async adjustInTransaction(
    tx: Prisma.TransactionClient,
    input: ExecuteAdjustmentInput,
  ) {
    const authorizationInput = {
      shopId: input.shopId,
      actorId: input.actorId,
    };
    if (input.pendingAction) {
      await this.authorization.assertCanUseChatbot(tx, authorizationInput);
    } else {
      await this.authorization.assertCanAdjustStock(tx, authorizationInput);
    }
    const quantityDelta =
      input.operation === 'INCREASE' ? input.quantity : -input.quantity;
    const stock = await this.inventory.adjustStock(tx, {
      shopId: input.shopId,
      shopProductId: input.shopProductId,
      quantityDelta,
    });
    const movement = await this.movements.create(tx, {
      shopId: input.shopId,
      shopProductId: input.shopProductId,
      actorId: input.actorId,
      movementType: input.pendingAction
        ? 'CHAT_ADJUSTMENT'
        : 'MANUAL_ADJUSTMENT',
      quantityDelta,
      quantityBefore: stock.quantityBefore,
      quantityAfter: stock.quantityAfter,
      source: input.source,
      note: input.note,
      referenceType: input.pendingAction ? 'PENDING_ACTION' : undefined,
      referenceId: input.pendingItemReferenceId ?? input.pendingAction?.id,
      pendingActionId: input.pendingAction?.id,
    });
    return { movement, stock };
  }
}
