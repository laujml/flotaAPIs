import { IsString, IsOptional, IsEmail, IsDateString, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LicenseType {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
}

export class CreateDriverDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'LIC123456' })
  @IsString()
  @MinLength(5)
  licenseNumber!: string;

  @ApiProperty({ enum: LicenseType, example: LicenseType.B })
  @IsEnum(LicenseType)
  licenseType!: LicenseType;

  @ApiProperty({ example: '2028-12-31' })
  @IsDateString()
  licenseExpiry!: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'juan.perez@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67, Bogotá' })
  @IsOptional()
  @IsString()
  address?: string;
}