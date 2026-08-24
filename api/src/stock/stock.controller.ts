import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
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

@Controller('shops/:shopId/stock')
export class StockController {
  constructor(
    private readonly stock: StockService,
    private readonly movements: StockMovementsService,
  ) {}

  @Post('adjust')
  adjust(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Headers('x-staff-id') actorId: string | undefined,
    @Body(new ZodValidationPipe(adjustStockSchema)) body: AdjustStockDto,
  ) {
    // TODO(auth): replace the temporary header adapter with authenticated staff.
    if (!actorId || !uuidSchema.safeParse(actorId).success) {
      throw new UnauthorizedException('Authenticated staff is required');
    }
    return this.stock.adjust({
      shopId,
      actorId,
      ...body,
      source: 'WEB',
    });
  }

  @Get('movements')
  history(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Query(new ZodValidationPipe(movementQuerySchema)) query: MovementQueryDto,
  ) {
    return this.movements.findHistory(shopId, query);
  }

  @Get('recent')
  recent(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Query(new ZodValidationPipe(recentMovementQuerySchema))
    query: RecentMovementQueryDto,
  ) {
    return this.movements.findRecent(shopId, query);
  }
}
