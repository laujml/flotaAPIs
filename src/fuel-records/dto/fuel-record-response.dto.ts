import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FuelRecordResponseDto {
  @ApiProperty({ example: 1, description: 'ID del registro de combustible' })
  id!: number;

  @ApiProperty({ example: 1, description: 'ID del viaje' })
  tripId!: number;

  @ApiProperty({ example: 1, description: 'ID del vehículo' })
  vehicleId!: number;

  @ApiProperty({ example: 150, description: 'Litros de combustible' })
  liters!: number;

  @ApiProperty({ example: 150000, description: 'Costo total' })
  cost!: number;

  @ApiProperty({ example: 1000, description: 'Precio por litro' })
  pricePerLiter!: number;

  @ApiProperty({ example: 125150, description: 'Odómetro al momento de la carga' })
  odometer!: number;

  @ApiProperty({ example: '2026-07-10T10:30:00.000Z', description: 'Fecha de la carga' })
  date!: Date;

  @ApiPropertyOptional({ example: 'Estación Central', description: 'Estación de servicio' })
  station?: string;

  @ApiProperty({ example: '2026-07-10T10:30:00.000Z', description: 'Fecha de creación' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-10T10:30:00.000Z', description: 'Fecha de actualización' })
  updatedAt!: Date;
}