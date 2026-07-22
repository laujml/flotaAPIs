import { ApiProperty } from '@nestjs/swagger';

export class DriverPerformanceDto {
  @ApiProperty() driverId!: number;
  @ApiProperty() name!: string;
  @ApiProperty() licenseNumber!: string;
  @ApiProperty() completedTrips!: number;
  @ApiProperty() totalKmDriven!: number;
  @ApiProperty() totalFuelCost!: number;
  @ApiProperty() averagePerformanceKmPerGallon!: number;
  @ApiProperty() rank!: number;
}