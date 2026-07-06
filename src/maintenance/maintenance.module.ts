import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [PrismaModule, VehiclesModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
