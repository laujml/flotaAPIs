import { ApiProperty } from '@nestjs/swagger';

export class VehicleEfficiencyDto {
  @ApiProperty() vehicleId!: number;
  @ApiProperty() plate!: string;
  @ApiProperty() type!: string;
  @ApiProperty() totalKmTraveled!: number;
  @ApiProperty() totalFuelCost!: number;
  @ApiProperty() totalMaintenanceCost!: number;
  @ApiProperty() totalOperationalCost!: number;
  @ApiProperty() costPerKm!: number;
  @ApiProperty() averagePerformanceKmPerGallon!: number;
  @ApiProperty() completedTrips!: number;
  @ApiProperty() maintenanceCount!: number;
  @ApiProperty() rank!: number;
}