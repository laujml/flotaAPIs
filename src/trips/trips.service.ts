import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FuelRecordsService } from '../fuel-records/fuel-records.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripResponseDto, TripPerformanceDto } from './dto/trip-response.dto';

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private fuelRecordsService: FuelRecordsService,
  ) {}

  async create(createTripDto: CreateTripDto): Promise<TripResponseDto> {
    // Verify driver exists and is active
    const driver = await this.prisma.driver.findUnique({
      where: { id: createTripDto.driverId },
    });
    if (!driver) {
      throw new NotFoundException(`Conductor con ID ${createTripDto.driverId} no encontrado`);
    }
    if (!driver.isActive) {
      throw new BadRequestException(`Conductor con ID ${createTripDto.driverId} no está activo`);
    }

    // Verify vehicle exists and is available
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: createTripDto.vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehículo con ID ${createTripDto.vehicleId} no encontrado`);
    }
    if (vehicle.state !== 'available') {
      throw new BadRequestException(`Vehículo con ID ${createTripDto.vehicleId} no está disponible (estado: ${vehicle.state})`);
    }

    // Check if driver has an active trip
    const activeDriverTrip = await this.prisma.trip.findFirst({
      where: {
        driverId: createTripDto.driverId,
        status: { in: ['planned', 'in_progress'] },
        deletedAt: null,
      },
    });
    if (activeDriverTrip) {
      throw new BadRequestException(`El conductor ya tiene un viaje activo (ID: ${activeDriverTrip.id})`);
    }

    // Check if vehicle has an active trip
    const activeVehicleTrip = await this.prisma.trip.findFirst({
      where: {
        vehicleId: createTripDto.vehicleId,
        status: { in: ['planned', 'in_progress'] },
        deletedAt: null,
      },
    });
    if (activeVehicleTrip) {
      throw new BadRequestException(`El vehículo ya tiene un viaje activo (ID: ${activeVehicleTrip.id})`);
    }

    const trip = await this.prisma.trip.create({
      data: {
        driverId: createTripDto.driverId,
        vehicleId: createTripDto.vehicleId,
        origin: createTripDto.origin,
        destination: createTripDto.destination,
        distance: createTripDto.distance ?? 0,
        cargoWeight: createTripDto.cargoWeight ?? 0,
        startOdometer: createTripDto.startOdometer ?? vehicle.currentOdometer,
        startDate: createTripDto.startDate ? new Date(createTripDto.startDate) : new Date(),
        status: 'planned',
      },
      include: {
        driver: { select: { id: true, name: true, licenseNumber: true } },
        vehicle: { select: { id: true, plate: true, type: true } },
      },
    });

    // Update vehicle state to 'in_use'
    await this.prisma.vehicle.update({
      where: { id: createTripDto.vehicleId },
      data: { state: 'in_use' },
    });

    return this.mapToResponseDto(trip);
  }

  async findAll(): Promise<TripResponseDto[]> {
    const trips = await this.prisma.trip.findMany({
      where: { deletedAt: null },
      include: {
        driver: { select: { id: true, name: true, licenseNumber: true } },
        vehicle: { select: { id: true, plate: true, type: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return trips.map(this.mapToResponseDto);
  }

  async findOne(id: number): Promise<TripResponseDto> {
    const trip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
      include: {
        driver: { select: { id: true, name: true, licenseNumber: true } },
        vehicle: { select: { id: true, plate: true, type: true } },
      },
    });
    if (!trip) {
      throw new NotFoundException(`Viaje con ID ${id} no encontrado`);
    }
    return this.mapToResponseDto(trip);
  }

  async findByDriver(driverId: number): Promise<TripResponseDto[]> {
    const trips = await this.prisma.trip.findMany({
      where: { driverId, deletedAt: null },
      include: {
        driver: { select: { id: true, name: true, licenseNumber: true } },
        vehicle: { select: { id: true, plate: true, type: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return trips.map(this.mapToResponseDto);
  }

  async findByVehicle(vehicleId: number): Promise<TripResponseDto[]> {
    const trips = await this.prisma.trip.findMany({
      where: { vehicleId, deletedAt: null },
      include: {
        driver: { select: { id: true, name: true, licenseNumber: true } },
        vehicle: { select: { id: true, plate: true, type: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return trips.map(this.mapToResponseDto);
  }

  async findByStatus(status: string): Promise<TripResponseDto[]> {
    const trips = await this.prisma.trip.findMany({
      where: { status, deletedAt: null },
      include: {
        driver: { select: { id: true, name: true, licenseNumber: true } },
        vehicle: { select: { id: true, plate: true, type: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    return trips.map(this.mapToResponseDto);
  }

  async update(id: number, updateTripDto: UpdateTripDto): Promise<TripResponseDto> {
    const existingTrip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existingTrip) {
      throw new NotFoundException(`Viaje con ID ${id} no encontrado`);
    }

    // If updating status to 'in_progress', verify vehicle and driver are available
    if (updateTripDto.status === 'in_progress' && existingTrip.status === 'planned') {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: existingTrip.vehicleId },
      });
      if (vehicle?.state !== 'in_use') {
        throw new BadRequestException('El vehículo debe estar en estado "in_use" para iniciar el viaje');
      }
    }

    // If completing the trip, validate required fields
    if (updateTripDto.status === 'completed') {
      if (!updateTripDto.endOdometer && !existingTrip.endOdometer) {
        throw new BadRequestException('El odómetro final es requerido para completar el viaje');
      }
      if (!updateTripDto.endDate && !existingTrip.endDate) {
        throw new BadRequestException('La fecha de finalización es requerida para completar el viaje');
      }
      if (updateTripDto.endOdometer !== undefined && updateTripDto.endOdometer < existingTrip.startOdometer) {
        throw new BadRequestException('El odómetro final no puede ser menor al inicial');
      }
    }

    const trip = await this.prisma.trip.update({
      where: { id },
      data: {
        ...updateTripDto,
        startDate: updateTripDto.startDate ? new Date(updateTripDto.startDate) : undefined,
        endDate: updateTripDto.endDate ? new Date(updateTripDto.endDate) : undefined,
      },
      include: {
        driver: { select: { id: true, name: true, licenseNumber: true } },
        vehicle: { select: { id: true, plate: true, type: true } },
      },
    });

    // If trip is completed or cancelled, update vehicle state
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      await this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { 
          state: 'available',
          currentOdometer: trip.endOdometer ?? trip.startOdometer,
        },
      });
    }

    return this.mapToResponseDto(trip);
  }

  async startTrip(id: number): Promise<TripResponseDto> {
    return this.update(id, { status: 'in_progress', startDate: new Date().toISOString() } as UpdateTripDto);
  }

  async completeTrip(id: number, endOdometer: number, endDate?: string): Promise<TripResponseDto> {
    // Use a transaction to atomically update trip, vehicle, and calculate performance
    const result = await this.prisma.$transaction(async (tx) => {
      // Get the trip with relations
      const trip = await tx.trip.findFirst({
        where: { id, deletedAt: null },
        include: {
          driver: { select: { id: true, name: true, licenseNumber: true } },
          vehicle: { select: { id: true, plate: true, type: true } },
        },
      });

      if (!trip) {
        throw new NotFoundException(`Viaje con ID ${id} no encontrado`);
      }

      if (trip.status === 'completed' || trip.status === 'cancelled') {
        throw new BadRequestException(`El viaje ya está ${trip.status === 'completed' ? 'completado' : 'cancelado'}`);
      }

      if (endOdometer < trip.startOdometer) {
        throw new BadRequestException('El odómetro final no puede ser menor al inicial');
      }

      // Update trip status to completed
      const updatedTrip = await tx.trip.update({
        where: { id },
        data: {
          status: 'completed',
          endOdometer,
          endDate: endDate ? new Date(endDate) : new Date(),
        },
        include: {
          driver: { select: { id: true, name: true, licenseNumber: true } },
          vehicle: { select: { id: true, plate: true, type: true } },
        },
      });

      // Update vehicle state to available and update odometer
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          state: 'available',
          currentOdometer: endOdometer,
        },
      });

      // Calculate performance using FuelRecordsService
      let performance: TripPerformanceDto | undefined;
      try {
        performance = await this.fuelRecordsService.calculateTripPerformance(id);
      } catch (error) {
        // If no fuel records exist, performance will be undefined
        // This is expected behavior - not all trips have fuel records
      }

      return this.mapToResponseDtoWithPerformance(updatedTrip, performance);
    });

    return result;
  }

  private mapToResponseDtoWithPerformance(trip: any, performance?: TripPerformanceDto): TripResponseDto & { performance?: TripPerformanceDto } {
    return {
      ...this.mapToResponseDto(trip),
      performance,
    };
  }

  async cancelTrip(id: number): Promise<TripResponseDto> {
    return this.update(id, { status: 'cancelled' } as UpdateTripDto);
  }

  async remove(id: number): Promise<void> {
    const trip = await this.prisma.trip.findFirst({
      where: { id, deletedAt: null },
    });
    if (!trip) {
      throw new NotFoundException(`Viaje con ID ${id} no encontrado`);
    }

    // Soft delete
    await this.prisma.trip.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // If trip was active, free up the vehicle
    if (['planned', 'in_progress'].includes(trip.status)) {
      await this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { state: 'available' },
      });
    }
  }

  private mapToResponseDto(trip: any): TripResponseDto {
    return {
      id: trip.id,
      driverId: trip.driverId,
      vehicleId: trip.vehicleId,
      origin: trip.origin,
      destination: trip.destination,
      distance: trip.distance,
      cargoWeight: trip.cargoWeight,
      startOdometer: trip.startOdometer,
      endOdometer: trip.endOdometer ?? undefined,
      startDate: trip.startDate,
      endDate: trip.endDate ?? undefined,
      status: trip.status,
      driver: trip.driver,
      vehicle: trip.vehicle,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    };
  }
}