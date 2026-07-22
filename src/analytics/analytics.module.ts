import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AlertsService } from './alerts.service';
import { CostCalculatorService } from './cost-calculator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FuelRecordsModule } from '../fuel-records/fuel-records.module';

@Module({
  imports: [PrismaModule, FuelRecordsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AlertsService, CostCalculatorService],
  exports: [AnalyticsService, AlertsService, CostCalculatorService],
})
export class AnalyticsModule {}