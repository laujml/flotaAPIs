import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty() totalVehicles: number;
  @ApiProperty() vehiclesInTransit: number;
  @ApiProperty() vehiclesAvailable: number;
  @ApiProperty() vehiclesInMaintenance: number;
  @ApiProperty() fleetAvailabilityPercent: number;
  @ApiProperty() totalKmTraveled: number;
  @ApiProperty() totalFuelCost: number;
  @ApiProperty() totalMaintenanceCost: number;
  @ApiProperty() totalOperationalCost: number;
  @ApiProperty() averageFleetCostPerKm: number;
  @ApiProperty() averageFleetPerformanceKmPerGallon: number;
}