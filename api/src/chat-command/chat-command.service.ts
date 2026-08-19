import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PendingAction,
  PendingActionSource,
  Prisma,
} from '../generated/prisma-client/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { StockService } from '../stock/stock.service';
import { STOCK_INVENTORY_PORT } from '../stock/ports/stock-inventory.port';
import type { StockInventoryPort } from '../stock/ports/stock-inventory.port';
import { UpdatePendingActionDto } from './dto/chat-command.dto';
import { STOCK_COMMAND_PARSER } from './parsers/stock-command-parser';
import type { StockCommandParser } from './parsers/stock-command-parser';

@Injectable()
export class ChatCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stock: StockService,
    @Inject(STOCK_COMMAND_PARSER)
    private readonly parser: StockCommandParser,
    @Inject(STOCK_INVENTORY_PORT)
    private readonly inventory: StockInventoryPort,
  ) {}

  async create(input: {
    shopId: string;
    actorId?: string;
    source: PendingActionSource;
    message: string;
  }) {
    const parsed = await this.parser.parse(input.message);
    const product = await this.inventory.resolveProduct(
      input.shopId,
      parsed.productQuery,
    );
    const ttl = this.config.get<number>('PENDING_ACTION_TTL_MINUTES', 15);
    return this.prisma.pendingAction.create({
      data: {
        shopId: input.shopId,
        actorId: input.actorId,
        source: input.source,
        originalMessage: input.message,
        intent: parsed.intent,
        shopProductId: product.shopProductId,
        productQuery: parsed.productQuery,
        operation: parsed.operation,
        quantity: parsed.quantity,
        expiresAt: new Date(Date.now() + ttl * 60_000),
        payload: parsed as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(
    shopId: string,
    pendingId: string,
    actorId: string,
    patch: UpdatePendingActionDto,
  ) {
    await this.expireElapsed(shopId, pendingId);
    const pending = await this.requirePending(shopId, pendingId);
    this.assertActionable(pending);
    this.assertActor(pending, actorId);
    let shopProductId = patch.shopProductId;
    if (patch.productQuery && !shopProductId) {
      shopProductId = (
        await this.inventory.resolveProduct(shopId, patch.productQuery)
      ).shopProductId;
    }
    const result = await this.prisma.pendingAction.updateMany({
      where: { id: pendingId, shopId, status: 'PENDING' },
      data: { ...patch, shopProductId },
    });
    if (result.count !== 1) {
      throw new ConflictException('Pending action changed concurrently');
    }
    return this.requirePending(shopId, pendingId);
  }

  async cancel(shopId: string, pendingId: string, actorId: string) {
    await this.expireElapsed(shopId, pendingId);
    const pending = await this.requirePending(shopId, pendingId);
    this.assertActionable(pending);
    this.assertActor(pending, actorId);
    const result = await this.prisma.pendingAction.updateMany({
      where: { id: pendingId, shopId, status: 'PENDING' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (result.count !== 1) {
      throw new ConflictException('Pending action changed concurrently');
    }
    return { id: pendingId, status: 'CANCELLED' as const };
  }

  confirm(shopId: string, pendingId: string, actorId: string) {
    return this.expireElapsed(shopId, pendingId).then(() =>
      this.prisma.$transaction(
        async (tx) => {
          const pending = await tx.pendingAction.findFirst({
            where: { id: pendingId, shopId },
          });
          if (!pending) throw new NotFoundException('Pending action not found');
          this.assertActionable(pending);
          if (pending.actorId && pending.actorId !== actorId) {
            throw new ForbiddenException(
              'Pending action belongs to another actor',
            );
          }
          if (!pending.shopProductId) {
            throw new BadRequestException(
              'Pending action has no resolved product',
            );
          }
          const adjusted = await this.stock.adjustInTransaction(tx, {
            shopId,
            shopProductId: pending.shopProductId,
            actorId,
            operation: pending.operation,
            quantity: pending.quantity,
            source: pending.source,
            pendingAction: pending,
          });
          const updated = await tx.pendingAction.updateMany({
            where: { id: pendingId, shopId, status: 'PENDING' },
            data: { status: 'CONFIRMED', confirmedAt: new Date(), actorId },
          });
          if (updated.count !== 1) {
            throw new ConflictException('Pending action changed concurrently');
          }
          return { ...adjusted, pendingActionId: pendingId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  private async requirePending(shopId: string, pendingId: string) {
    const pending = await this.prisma.pendingAction.findFirst({
      where: { id: pendingId, shopId },
    });
    if (!pending) throw new NotFoundException('Pending action not found');
    return pending;
  }

  private assertActionable(pending: PendingAction): void {
    if (pending.status === 'CONFIRMED') {
      throw new ConflictException('Pending action is already confirmed');
    }
    if (pending.status === 'CANCELLED') {
      throw new ConflictException('Pending action is cancelled');
    }
    if (pending.status === 'EXPIRED' || pending.expiresAt <= new Date()) {
      throw new GoneException('Pending action is expired');
    }
  }

  private assertActor(pending: PendingAction, actorId: string): void {
    if (pending.actorId !== actorId) {
      throw new ForbiddenException('Pending action belongs to another actor');
    }
  }

  private async expireElapsed(
    shopId: string,
    pendingId: string,
  ): Promise<void> {
    await this.prisma.pendingAction.updateMany({
      where: {
        id: pendingId,
        shopId,
        status: 'PENDING',
        expiresAt: { lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
  }
}
