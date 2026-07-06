import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { FleetReportService } from './fleet-report.service';
import { FleetReportController } from './fleet-report.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [VehiclesController, FleetReportController],
  providers: [VehiclesService, FleetReportService, AuditService],
  exports: [VehiclesService, FleetReportService, AuditService],
})
export class VehiclesModule {}
