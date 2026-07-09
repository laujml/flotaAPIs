import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LicenseType } from './create-driver.dto';

export class DriverResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Juan Pérez' })
  name!: string;

  @ApiProperty({ example: 'LIC123456' })
  licenseNumber!: string;

  @ApiProperty({ enum: LicenseType, example: LicenseType.B })
  licenseType!: LicenseType;

  @ApiProperty({ example: '2028-12-31T00:00:00.000Z' })
  licenseExpiry!: Date;

  @ApiPropertyOptional({ example: '+57 300 123 4567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'juan.perez@email.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Calle 123 #45-67, Bogotá' })
  address?: string;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: null })
  deletedAt?: Date | null;
}