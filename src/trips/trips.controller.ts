import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/roles/role.enum';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('trips')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Crear un nuevo viaje' })
  @ApiResponse({ status: 201, description: 'Viaje creado exitosamente', type: TripResponseDto })
  @ApiResponse({ status: 400, description: 'Datos inválidos o conductor/vehículo no disponible' })
  @ApiResponse({ status: 404, description: 'Conductor o vehículo no encontrado' })
  async create(@Body() createTripDto: CreateTripDto): Promise<TripResponseDto> {
    return this.tripsService.create(createTripDto);
  }

  @Get()
  @Roles(Role.Admin, Role.Operator, Role.Driver)
  @ApiOperation({ summary: 'Obtener todos los viajes' })
  @ApiResponse({ status: 200, description: 'Lista de viajes', type: [TripResponseDto] })
  @ApiQuery({ name: 'driverId', required: false, type: Number, description: 'Filtrar por ID de conductor' })
  @ApiQuery({ name: 'vehicleId', required: false, type: Number, description: 'Filtrar por ID de vehículo' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filtrar por estado' })
  async findAll(
    @Query('driverId') driverId?: number,
    @Query('vehicleId') vehicleId?: number,
    @Query('status') status?: string,
  ): Promise<TripResponseDto[]> {
    if (driverId) {
      return this.tripsService.findByDriver(driverId);
    }
    if (vehicleId) {
      return this.tripsService.findByVehicle(vehicleId);
    }
    if (status) {
      return this.tripsService.findByStatus(status);
    }
    return this.tripsService.findAll();
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Operator, Role.Driver)
  @ApiOperation({ summary: 'Obtener un viaje por ID' })
  @ApiResponse({ status: 200, description: 'Viaje encontrado', type: TripResponseDto })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del viaje' })
  async findOne(@Param('id') id: string): Promise<TripResponseDto> {
    return this.tripsService.findOne(+id);
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Actualizar un viaje' })
  @ApiResponse({ status: 200, description: 'Viaje actualizado', type: TripResponseDto })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del viaje' })
  async update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto): Promise<TripResponseDto> {
    return this.tripsService.update(+id, updateTripDto);
  }

  @Put(':id/start')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Iniciar un viaje (cambiar estado a in_progress)' })
  @ApiResponse({ status: 200, description: 'Viaje iniciado', type: TripResponseDto })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del viaje' })
  async startTrip(@Param('id') id: string): Promise<TripResponseDto> {
    return this.tripsService.startTrip(+id);
  }

  @Put(':id/complete')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Completar un viaje (requiere odómetro final)' })
  @ApiResponse({ status: 200, description: 'Viaje completado', type: TripResponseDto })
  @ApiResponse({ status: 400, description: 'Odómetro final requerido' })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del viaje' })
  @ApiQuery({ name: 'endOdometer', required: true, type: Number, description: 'Odómetro final' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Fecha de finalización (ISO string)' })
  async completeTrip(
    @Param('id') id: string,
    @Query('endOdometer') endOdometer: number,
    @Query('endDate') endDate?: string,
  ): Promise<TripResponseDto> {
    return this.tripsService.completeTrip(+id, endOdometer, endDate);
  }

  @Put(':id/cancel')
  @Roles(Role.Admin, Role.Operator)
  @ApiOperation({ summary: 'Cancelar un viaje' })
  @ApiResponse({ status: 200, description: 'Viaje cancelado', type: TripResponseDto })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del viaje' })
  async cancelTrip(@Param('id') id: string): Promise<TripResponseDto> {
    return this.tripsService.cancelTrip(+id);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Eliminar un viaje (soft delete)' })
  @ApiResponse({ status: 204, description: 'Viaje eliminado' })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  @ApiParam({ name: 'id', type: Number, description: 'ID del viaje' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tripsService.remove(+id);
  }
}