import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import {
  BestSellersQuerySchema,
  DashboardQuerySchema,
  DeadStockQuerySchema,
  SalesTrendQuerySchema,
  type BestSellersQueryDto,
  type DashboardQueryDto,
  type DeadStockQueryDto,
  type SalesTrendQueryDto,
} from './dto/dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('shops/:shopId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getShopDashboard(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(DashboardQuerySchema))
    query: DashboardQueryDto,
  ) {
    return this.dashboardService.getShopDashboard(userId, shopId, query);
  }

  @Get('best-sellers')
  getBestSellers(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(BestSellersQuerySchema))
    query: BestSellersQueryDto,
  ) {
    return this.dashboardService.getBestSellers(userId, shopId, query);
  }

  @Get('dead-stock')
  getDeadStock(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(DeadStockQuerySchema))
    query: DeadStockQueryDto,
  ) {
    return this.dashboardService.getDeadStock(userId, shopId, query);
  }

  @Get('reports/sales-trend')
  getSalesTrend(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(SalesTrendQuerySchema))
    query: SalesTrendQueryDto,
  ) {
    return this.dashboardService.getSalesTrend(userId, shopId, query);
  }

  @Get('reports/by-category')
  getSalesByCategory(
    @CurrentUser('sub') userId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query(new ZodValidationPipe(DashboardQuerySchema))
    query: DashboardQueryDto,
  ) {
    return this.dashboardService.getSalesByCategory(userId, shopId, query);
  }
}
