import { IsNumber, IsString, IsOptional, IsDate, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scheduledOdometer?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
