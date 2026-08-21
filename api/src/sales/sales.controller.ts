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
    @Headers('x-staff-id') staffId: string | undefined,
    @Body(new ZodValidationPipe(scanSaleSchema)) body: ScanSaleDto,
  ) {
    return this.sales.scan(shopId, this.requireStaff(staffId), body.barcode);
  }
  @Post() create(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Headers('x-staff-id') staffId: string | undefined,
    @Body(new ZodValidationPipe(createSaleSchema)) body: CreateSaleDto,
  ) {
    return this.sales.create(shopId, this.requireStaff(staffId), body);
  }
  @Get() list(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Headers('x-staff-id') staffId: string | undefined,
    @Query(new ZodValidationPipe(saleQuerySchema)) query: SaleQueryDto,
  ) {
    return this.sales.list(shopId, this.requireStaff(staffId), query);
  }
  @Get(':saleId') get(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('saleId', new ZodValidationPipe(uuidSchema)) saleId: string,
    @Headers('x-staff-id') staffId: string | undefined,
  ) {
    return this.sales.get(shopId, this.requireStaff(staffId), saleId);
  }
  @Post(':saleId/void') void(
    @Param('shopId', new ZodValidationPipe(uuidSchema)) shopId: string,
    @Param('saleId', new ZodValidationPipe(uuidSchema)) saleId: string,
    @Headers('x-staff-id') staffId: string | undefined,
    @Body(new ZodValidationPipe(voidSaleSchema)) body: VoidSaleDto,
  ) {
    return this.sales.void(
      shopId,
      this.requireStaff(staffId),
      saleId,
      body.reason,
    );
  }

  private requireStaff(staffId: string | undefined) {
    if (!staffId || !uuidSchema.safeParse(staffId).success)
      throw new UnauthorizedException('Authenticated staff is required');
    return staffId;
  }
}
