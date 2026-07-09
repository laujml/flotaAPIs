import { PartialType } from '@nestjs/swagger';
import { CreateTripDto } from './create-trip.dto';
import { IsOptional, IsNumber, IsString, IsDateString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTripDto extends PartialType(CreateTripDto) {
  @ApiPropertyOptional({ example: 415, description: 'Distancia recorrida en km' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @ApiPropertyOptional({ example: 125415, description: 'Odómetro final del vehículo' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  endOdometer?: number;

  @ApiPropertyOptional({ example: '2026-07-10T14:30:00Z', description: 'Fecha de finalización del viaje' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'completed', description: 'Estado del viaje: planned, in_progress, completed, cancelled' })
  @IsOptional()
  @IsString()
  status?: string;
}