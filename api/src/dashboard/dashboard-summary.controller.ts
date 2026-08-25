import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import {
  DashboardQuerySchema,
  type DashboardQueryDto,
} from './dto/dashboard.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardSummaryController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getAccountSummary(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(DashboardQuerySchema))
    query: DashboardQueryDto,
  ) {
    return this.dashboardService.getAccountSummary(userId, query);
  }
}
