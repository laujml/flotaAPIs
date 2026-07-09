import { IsInt, IsNumber, IsOptional, IsString, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFuelRecordDto {
  @ApiProperty({ example: 1, description: 'ID del viaje' })
  @IsInt()
  tripId!: number;

  @ApiProperty({ example: 1, description: 'ID del vehículo' })
  @IsInt()
  vehicleId!: number;

  @ApiProperty({ example: 150, description: 'Litros de combustible' })
  @IsNumber()
  @Min(0)
  liters!: number;

  @ApiProperty({ example: 150000, description: 'Costo total' })
  @IsNumber()
  @Min(0)
  cost!: number;

  @ApiProperty({ example: 1000, description: 'Precio por litro' })
  @IsNumber()
  @Min(0)
  pricePerLiter!: number;

  @ApiProperty({ example: 125150, description: 'Odómetro al momento de la carga' })
  @IsNumber()
  @Min(0)
  odometer!: number;

  @ApiPropertyOptional({ example: '2026-07-10T10:30:00Z', description: 'Fecha de la carga' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'Estación Central', description: 'Estación de servicio' })
  @IsOptional()
  @IsString()
  station?: string;
}