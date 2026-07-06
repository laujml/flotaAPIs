import { IsNumber, IsString, IsOptional, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaintenanceDto {
  @IsNumber()
  vehicleId!: number;

  @IsString()
  type!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scheduledOdometer?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;
}
