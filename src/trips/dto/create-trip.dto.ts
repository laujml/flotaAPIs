import { IsInt, IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripDto {
  @ApiProperty({ example: 1, description: 'ID del conductor' })
  @IsInt()
  driverId!: number;

  @ApiProperty({ example: 1, description: 'ID del vehículo' })
  @IsInt()
  vehicleId!: number;

  @ApiProperty({ example: 'Bogotá', description: 'Ciudad de origen' })
  @IsString()
  origin!: string;

  @ApiProperty({ example: 'Medellín', description: 'Ciudad de destino' })
  @IsString()
  destination!: string;

  @ApiPropertyOptional({ example: 415, description: 'Distancia en km' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Peso de la carga en kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cargoWeight?: number;

  @ApiPropertyOptional({ example: 125000, description: 'Odómetro inicial del vehículo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  startOdometer?: number;

  @ApiPropertyOptional({ example: '2026-07-10T08:00:00Z', description: 'Fecha de inicio del viaje' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}