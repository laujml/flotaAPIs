import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FleetReportService } from './fleet-report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('fleet-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fleet-reports')
export class FleetReportController {
  constructor(private fleetReportService: FleetReportService) {}

  @Get('efficiency')
  getFleetEfficiencyReport() {
    return this.fleetReportService.getFleetEfficiencyReport();
  }

  @Get('vehicle/:vehicleId/comparison')
  getVehicleComparisonReport(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.fleetReportService.getVehicleComparisonReport(vehicleId);
  }
}
