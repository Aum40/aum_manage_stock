import { Module } from '@nestjs/common';
import { DashboardAccessService } from './dashboard-access.service';
import { DashboardSummaryController } from './dashboard-summary.controller';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController, DashboardSummaryController],
  providers: [DashboardService, DashboardAccessService],
})
export class DashboardModule {}
