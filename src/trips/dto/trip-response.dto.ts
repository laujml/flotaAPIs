import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TripPerformanceDto {
  @ApiProperty({ example: 50 })
  totalLiters!: number;

  @ApiProperty({ example: 150 })
  totalCost!: number;

  @ApiProperty({ example: 420 })
  distanceKm!: number;

  @ApiProperty({ example: 8.4 })
  kmPerLiter!: number;

  @ApiProperty({ example: 31.8 })
  kmPerGallon!: number;

  @ApiProperty({ example: 3 })
  averagePricePerLiter!: number;
}

export class TripResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  driverId!: number;

  @ApiProperty({ example: 1 })
  vehicleId!: number;

  @ApiProperty({ example: 'Bogotá' })
  origin!: string;

  @ApiProperty({ example: 'Medellín' })
  destination!: string;

  @ApiProperty({ example: 415 })
  distance!: number;

  @ApiProperty({ example: 5000 })
  cargoWeight!: number;

  @ApiProperty({ example: 125000 })
  startOdometer!: number;

  @ApiPropertyOptional({ example: 125415 })
  endOdometer?: number;

  @ApiProperty({ example: '2026-07-10T08:00:00.000Z' })
  startDate!: Date;

  @ApiPropertyOptional({ example: '2026-07-10T14:30:00.000Z' })
  endDate?: Date;

  @ApiProperty({ example: 'planned' })
  status!: string;

  @ApiPropertyOptional()
  driver?: {
    id: number;
    name: string;
    licenseNumber: string;
  };

  @ApiPropertyOptional()
  vehicle?: {
    id: number;
    plate: string;
    type: string;
  };

  @ApiPropertyOptional({ type: TripPerformanceDto })
  performance?: TripPerformanceDto;

  @ApiProperty({ example: '2026-07-10T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-10T08:00:00.000Z' })
  updatedAt!: Date;
}