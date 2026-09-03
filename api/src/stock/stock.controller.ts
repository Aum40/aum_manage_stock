import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { uuidSchema } from '../common/validation/schemas';
import {
  movementQuerySchema,
  recentMovementQuerySchema,
} from '../stock-movements/dto/movement-query.dto';
import type {
  MovementQueryDto,
  RecentMovementQueryDto,
} from '../stock-movements/dto/movement-query.dto';
import { StockMovementsService } from '../stock-movements/stock-movements.service';
import { adjustStockSchema } from './dto/adjust-stock.dto';
import type { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockService } from './stock.service';
import { STOCK_AUTHORIZATION_PORT } from './ports/stock-authorization.port';
import type { StockAuthorizationPort } from './ports/stock-authorization.port';

@Controller('shops/:shopId/stock')
export class StockController {
  constructor(
    private readonly stock: StockService,
    private readonly movements: StockMovementsService,
    private readonly prisma: PrismaService,
    @Inject(STOCK_AUTHORIZATION_PORT)
    private readonly authorization: StockAuthorizationPort,
  ) {}

  @Post('adjust')
  adjust(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(adjustStockSchema)) body: AdjustStockDto,
  ) {
    return this.stock.adjust({
      shopId,
      actorId,
      ...body,
      source: 'WEB',
    });
  }

  @Get('movements')
  async history(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @CurrentUser('sub') actorId: string,
    @Query(new ZodValidationPipe(movementQuerySchema)) query: MovementQueryDto,
  ) {
    await this.prisma.$transaction((tx) =>
      this.authorization.assertCanViewStock(tx, { shopId, actorId }),
    );
    return this.movements.findHistory(shopId, query);
  }

  @Get('recent')
  async recent(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @CurrentUser('sub') actorId: string,
    @Query(new ZodValidationPipe(recentMovementQuerySchema))
    query: RecentMovementQueryDto,
  ) {
    await this.prisma.$transaction((tx) =>
      this.authorization.assertCanViewStock(tx, { shopId, actorId }),
    );
    return this.movements.findRecent(shopId, query);
  }
}
