import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOdometer?: number;
}
