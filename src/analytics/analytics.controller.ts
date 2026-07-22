import { Controller, Get, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AlertsService } from './alerts.service';
import { CostCalculatorService } from './cost-calculator.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles/role.enum';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private alertsService: AlertsService,
    private costCalculator: CostCalculatorService,
  ) {}

  @Get('dashboard/summary')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Resumen general del dashboard de la flota' })
  getDashboardSummary() {
    return this.analyticsService.getDashboardSummary();
  }

  @Get('dashboard/top-vehicles')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Top vehículos por eficiencia operativa (ranking por costo/km)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número de vehículos a retornar (default 10)' })
  getTopVehicles(@Query('limit') limit?: string) {
    return this.analyticsService.getTopVehicles(limit ? parseInt(limit) : 10);
  }

  @Get('dashboard/top-drivers')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Top conductores por desempeño' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Número de conductores a retornar (default 10)' })
  getTopDrivers(@Query('limit') limit?: string) {
    return this.analyticsService.getTopDrivers(limit ? parseInt(limit) : 10);
  }

  @Get('alerts/performance')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Alertas de rendimiento: vehículos con rendimiento >15% bajo el promedio (RN-07)' })
  getPerformanceAlerts() {
    return this.alertsService.getPerformanceAlerts();
  }

  @Get('alerts/maintenance')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Alertas de mantenimiento próximo o vencido' })
  getMaintenanceAlerts() {
    return this.alertsService.getMaintenanceAlerts();
  }

  @Get('alerts/vehicle/:vehicleId')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Todas las alertas de un vehículo específico' })
  @ApiParam({ name: 'vehicleId', type: Number })
  getVehicleAlerts(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.alertsService.getVehicleAlerts(vehicleId);
  }

  @Get('vehicles/:vehicleId/cost-per-km')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Cálculo de costo por km de un vehículo (RN-08): (combustible + mantenimiento) / km' })
  @ApiParam({ name: 'vehicleId', type: Number })
  getVehicleCostPerKm(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.costCalculator.calculateCostPerKm(vehicleId);
  }

  @Get('fleet/ranking')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Ranking completo de eficiencia de flota por costo operativo' })
  getFleetRanking() {
    return this.analyticsService.getFleetEfficiencyRanking();
  }
}
