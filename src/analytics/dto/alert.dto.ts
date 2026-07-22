import { ApiProperty } from '@nestjs/swagger';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export class AlertDto {
  @ApiProperty() type: 'PERFORMANCE' | 'MAINTENANCE';
  @ApiProperty() severity: AlertSeverity;
  @ApiProperty() vehicleId: number;
  @ApiProperty() plate: string;
  @ApiProperty() message: string;
  @ApiProperty() details: Record<string, any>;
  @ApiProperty() createdAt: string;
}

export class VehicleCostPerKmDto {
  @ApiProperty() vehicleId: number;
  @ApiProperty() plate: string;
  @ApiProperty() type: string;
  @ApiProperty() totalFuelCost: number;
  @ApiProperty() totalMaintenanceCost: number;
  @ApiProperty() totalOperationalCost: number;
  @ApiProperty() totalKmTraveled: number;
  @ApiProperty() costPerKm: number;
}