import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  plate!: string;

  @IsString()
  type!: string;

  @IsNumber()
  @Min(0)
  capacity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOdometer?: number;
}
