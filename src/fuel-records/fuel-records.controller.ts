import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FuelRecordsService } from './fuel-records.service';
import { CreateFuelRecordDto } from './dto/create-fuel-record.dto';
import { UpdateFuelRecordDto } from './dto/update-fuel-record.dto';
import { FuelRecordResponseDto } from './dto/fuel-record-response.dto';

@ApiTags('fuel-records')
@Controller('fuel-records')
export class FuelRecordsController {
  constructor(private readonly fuelRecordsService: FuelRecordsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo registro de combustible' })
  @ApiResponse({ status: 201, description: 'Registro creado exitosamente', type: FuelRecordResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o restricciones de odómetro violadas' })
  @ApiResponse({ status: 404, description: 'Viaje o vehículo no encontrado' })
  async create(@Body() createFuelRecordDto: CreateFuelRecordDto): Promise<FuelRecordResponseDto> {
    return this.fuelRecordsService.create(createFuelRecordDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los registros de combustible' })
  @ApiResponse({ status: 200, description: 'Lista de registros', type: [FuelRecordResponseDto] })
  async findAll(): Promise<FuelRecordResponseDto[]> {
    return this.fuelRecordsService.findAll();
  }

  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Obtener registros de combustible por viaje' })
  @ApiParam({ name: 'tripId', type: 'number', description: 'ID del viaje' })
  @ApiResponse({ status: 200, description: 'Lista de registros del viaje', type: [FuelRecordResponseDto] })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  async findByTripId(@Param('tripId', ParseIntPipe) tripId: number): Promise<FuelRecordResponseDto[]> {
    return this.fuelRecordsService.findByTripId(tripId);
  }

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Obtener registros de combustible por vehículo' })
  @ApiParam({ name: 'vehicleId', type: 'number', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Lista de registros del vehículo', type: [FuelRecordResponseDto] })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  async findByVehicleId(@Param('vehicleId', ParseIntPipe) vehicleId: number): Promise<FuelRecordResponseDto[]> {
    return this.fuelRecordsService.findByVehicleId(vehicleId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de combustible por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del registro' })
  @ApiResponse({ status: 200, description: 'Registro encontrado', type: FuelRecordResponseDto })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<FuelRecordResponseDto> {
    return this.fuelRecordsService.findOne(id);
  }

  @Get(':id/performance')
  @ApiOperation({ summary: 'Calcular rendimiento del viaje (km/galón)' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del viaje' })
  @ApiResponse({
    status: 200,
    description: 'Rendimiento calculado',
    schema: {
      example: {
        totalLiters: 150,
        totalCost: 150000,
        distanceKm: 500,
        kmPerLiter: 3.33,
        kmPerGallon: 12.61,
        averagePricePerLiter: 1000,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Viaje no completado o sin registros de combustible' })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  async calculatePerformance(@Param('id', ParseIntPipe) tripId: number) {
    return this.fuelRecordsService.calculateTripPerformance(tripId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un registro de combustible' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del registro' })
  @ApiResponse({ status: 200, description: 'Registro actualizado', type: FuelRecordResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o restricciones violadas' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFuelRecordDto: UpdateFuelRecordDto,
  ): Promise<FuelRecordResponseDto> {
    return this.fuelRecordsService.update(id, updateFuelRecordDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un registro de combustible' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del registro' })
  @ApiResponse({ status: 204, description: 'Registro eliminado' })
  @ApiResponse({ status: 404, description: 'Registro no encontrado' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.fuelRecordsService.remove(id);
  }
}