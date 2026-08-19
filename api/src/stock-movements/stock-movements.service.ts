import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma-client/client';
import { PrismaService } from '../database/prisma.service';
import {
  MovementQueryDto,
  RecentMovementQueryDto,
} from './dto/movement-query.dto';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.StockMovementUncheckedCreateInput,
  ) {
    return tx.stockMovement.create({ data });
  }

  async findHistory(shopId: string, query: MovementQueryDto) {
    const items = await this.prisma.stockMovement.findMany({
      where: {
        shopId,
        shopProductId: query.shopProductId,
        actorId: query.actorId,
        movementType: query.movementType,
        createdAt:
          query.from || query.to
            ? { gte: query.from, lte: query.to }
            : undefined,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? page.at(-1)?.id : null,
    };
  }

  async findRecent(shopId: string, query: RecentMovementQueryDto) {
    if (query.sort === 'frequent') {
      return this.prisma.stockMovement.groupBy({
        by: ['shopProductId'],
        where: { shopId },
        _count: { shopProductId: true },
        _max: { createdAt: true },
        orderBy: [{ _count: { shopProductId: 'desc' } }],
        take: query.limit,
      });
    }

    return this.prisma.stockMovement.groupBy({
      by: ['shopProductId'],
      where: { shopId },
      _count: { shopProductId: true },
      _max: { createdAt: true },
      orderBy: [{ _max: { createdAt: 'desc' } }],
      take: query.limit,
    });
  }
}
