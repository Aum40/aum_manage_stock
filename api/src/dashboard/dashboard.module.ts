import { Module } from '@nestjs/common';
import { DashboardAccessService } from './dashboard-access.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardAccessService],
})
export class DashboardModule {}
