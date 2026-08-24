import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { uuidSchema } from '../common/validation/schemas';
import {
  createSaleSchema,
  saleQuerySchema,
  scanSaleSchema,
  voidSaleSchema,
  type CreateSaleDto,
  type SaleQueryDto,
  type ScanSaleDto,
  type VoidSaleDto,
} from './dto/sales.dto';
import { SalesService } from './sales.service';

@Controller('shops/:shopId/sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Post('scan') scan(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @CurrentUser('sub') staffId: string,
    @Body(new ZodValidationPipe(scanSaleSchema)) body: ScanSaleDto,
  ) {
    return this.sales.scan(shopId, staffId, body.barcode);
  }
  @Post() create(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @CurrentUser('sub') staffId: string,
    @Body(new ZodValidationPipe(createSaleSchema)) body: CreateSaleDto,
  ) {
    return this.sales.create(shopId, staffId, body);
  }
  @Get() list(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @CurrentUser('sub') staffId: string,
    @Query(new ZodValidationPipe(saleQuerySchema)) query: SaleQueryDto,
  ) {
    return this.sales.list(shopId, staffId, query);
  }
  @Get(':saleId') get(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('saleId', new ZodValidationPipe(uuidSchema)) saleId: string,
    @CurrentUser('sub') staffId: string,
  ) {
    return this.sales.get(shopId, staffId, saleId);
  }
  @Post(':saleId/void') void(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('saleId', new ZodValidationPipe(uuidSchema)) saleId: string,
    @CurrentUser('sub') staffId: string,
    @Body(new ZodValidationPipe(voidSaleSchema)) body: VoidSaleDto,
  ) {
    return this.sales.void(shopId, staffId, saleId, body.reason);
  }
}
