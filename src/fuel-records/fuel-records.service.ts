import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient, FuelRecord, Trip, Vehicle } from '@prisma/client';
import { CreateFuelRecordDto } from './dto/create-fuel-record.dto';
import { UpdateFuelRecordDto } from './dto/update-fuel-record.dto';
import { FuelRecordResponseDto } from './dto/fuel-record-response.dto';

const prisma = new PrismaClient();

@Injectable()
export class FuelRecordsService {
  async create(createFuelRecordDto: CreateFuelRecordDto): Promise<FuelRecordResponseDto> {
    // Verify trip exists
    const trip = await prisma.trip.findUnique({
      where: { id: createFuelRecordDto.tripId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${createFuelRecordDto.tripId} not found`);
    }

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: createFuelRecordDto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${createFuelRecordDto.vehicleId} not found`);
    }

    // Verify the trip belongs to the vehicle
    if (trip.vehicleId !== createFuelRecordDto.vehicleId) {
      throw new BadRequestException(
        `Trip ${createFuelRecordDto.tripId} does not belong to vehicle ${createFuelRecordDto.vehicleId}`,
      );
    }

    // Verify odometer is not less than trip start odometer
    if (createFuelRecordDto.odometer < trip.startOdometer) {
      throw new BadRequestException(
        `Odometer reading (${createFuelRecordDto.odometer}) cannot be less than trip start odometer (${trip.startOdometer})`,
      );
    }

    // If trip has endOdometer, verify odometer is not greater than endOdometer
    if (trip.endOdometer && createFuelRecordDto.odometer > trip.endOdometer) {
      throw new BadRequestException(
        `Odometer reading (${createFuelRecordDto.odometer}) cannot be greater than trip end odometer (${trip.endOdometer})`,
      );
    }

    const fuelRecord = await prisma.fuelRecord.create({
      data: {
        tripId: createFuelRecordDto.tripId,
        vehicleId: createFuelRecordDto.vehicleId,
        liters: createFuelRecordDto.liters,
        cost: createFuelRecordDto.cost,
        pricePerLiter: createFuelRecordDto.pricePerLiter,
        odometer: createFuelRecordDto.odometer,
        date: createFuelRecordDto.date ? new Date(createFuelRecordDto.date) : new Date(),
        station: createFuelRecordDto.station,
      },
      include: {
        trip: true,
        vehicle: true,
      },
    });

    return this.mapToResponseDto(fuelRecord);
  }

  async findAll(): Promise<FuelRecordResponseDto[]> {
    const fuelRecords = await prisma.fuelRecord.findMany({
      include: {
        trip: true,
        vehicle: true,
      },
      orderBy: { date: 'desc' },
    });

    return fuelRecords.map((record) => this.mapToResponseDto(record));
  }

  async findByTripId(tripId: number): Promise<FuelRecordResponseDto[]> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    const fuelRecords = await prisma.fuelRecord.findMany({
      where: { tripId },
      include: {
        trip: true,
        vehicle: true,
      },
      orderBy: { date: 'asc' },
    });

    return fuelRecords.map((record) => this.mapToResponseDto(record));
  }

  async findByVehicleId(vehicleId: number): Promise<FuelRecordResponseDto[]> {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
    }

    const fuelRecords = await prisma.fuelRecord.findMany({
      where: { vehicleId },
      include: {
        trip: true,
        vehicle: true,
      },
      orderBy: { date: 'desc' },
    });

    return fuelRecords.map((record) => this.mapToResponseDto(record));
  }

  async findOne(id: number): Promise<FuelRecordResponseDto> {
    const fuelRecord = await prisma.fuelRecord.findUnique({
      where: { id },
      include: {
        trip: true,
        vehicle: true,
      },
    });

    if (!fuelRecord) {
      throw new NotFoundException(`Fuel record with ID ${id} not found`);
    }

    return this.mapToResponseDto(fuelRecord);
  }

  async update(id: number, updateFuelRecordDto: UpdateFuelRecordDto): Promise<FuelRecordResponseDto> {
    const existingRecord = await prisma.fuelRecord.findUnique({
      where: { id },
      include: { trip: true },
    });

    if (!existingRecord) {
      throw new NotFoundException(`Fuel record with ID ${id} not found`);
    }

    // If updating tripId or vehicleId, verify they exist and match
    if (updateFuelRecordDto.tripId || updateFuelRecordDto.vehicleId) {
      const tripId = updateFuelRecordDto.tripId ?? existingRecord.tripId;
      const vehicleId = updateFuelRecordDto.vehicleId ?? existingRecord.vehicleId;

      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) {
        throw new NotFoundException(`Trip with ID ${tripId} not found`);
      }

      const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle) {
        throw new NotFoundException(`Vehicle with ID ${vehicleId} not found`);
      }

      if (trip.vehicleId !== vehicleId) {
        throw new BadRequestException(`Trip ${tripId} does not belong to vehicle ${vehicleId}`);
      }

      // Verify odometer constraints
      const odometer = updateFuelRecordDto.odometer ?? existingRecord.odometer;
      if (odometer < trip.startOdometer) {
        throw new BadRequestException(
          `Odometer reading (${odometer}) cannot be less than trip start odometer (${trip.startOdometer})`,
        );
      }

      if (trip.endOdometer && odometer > trip.endOdometer) {
        throw new BadRequestException(
          `Odometer reading (${odometer}) cannot be greater than trip end odometer (${trip.endOdometer})`,
        );
      }
    }

    const fuelRecord = await prisma.fuelRecord.update({
      where: { id },
      data: {
        ...updateFuelRecordDto,
        date: updateFuelRecordDto.date ? new Date(updateFuelRecordDto.date) : undefined,
      },
      include: {
        trip: true,
        vehicle: true,
      },
    });

    return this.mapToResponseDto(fuelRecord);
  }

  async remove(id: number): Promise<void> {
    const fuelRecord = await prisma.fuelRecord.findUnique({
      where: { id },
    });

    if (!fuelRecord) {
      throw new NotFoundException(`Fuel record with ID ${id} not found`);
    }

    await prisma.fuelRecord.delete({
      where: { id },
    });
  }

  async calculateTripPerformance(tripId: number): Promise<{
    totalLiters: number;
    totalCost: number;
    distanceKm: number;
    kmPerLiter: number;
    kmPerGallon: number;
    averagePricePerLiter: number;
  }> {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { fuelRecords: true },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    if (!trip.endOdometer) {
      throw new BadRequestException('Trip must be completed (have endOdometer) to calculate performance');
    }

    const fuelRecords = trip.fuelRecords;
    const totalLiters = fuelRecords.reduce((sum, record) => sum + record.liters, 0);
    const totalCost = fuelRecords.reduce((sum, record) => sum + record.cost, 0);
    const distanceKm = trip.endOdometer - trip.startOdometer;

    if (totalLiters === 0) {
      throw new BadRequestException('No fuel records found for this trip');
    }

    const kmPerLiter = distanceKm / totalLiters;
    const kmPerGallon = kmPerLiter * 3.78541; // 1 gallon = 3.78541 liters
    const averagePricePerLiter = totalCost / totalLiters;

    return {
      totalLiters,
      totalCost,
      distanceKm,
      kmPerLiter: Number(kmPerLiter.toFixed(2)),
      kmPerGallon: Number(kmPerGallon.toFixed(2)),
      averagePricePerLiter: Number(averagePricePerLiter.toFixed(2)),
    };
  }

  private mapToResponseDto(fuelRecord: FuelRecord & { trip: Trip; vehicle: Vehicle }): FuelRecordResponseDto {
    return {
      id: fuelRecord.id,
      tripId: fuelRecord.tripId,
      vehicleId: fuelRecord.vehicleId,
      liters: fuelRecord.liters,
      cost: fuelRecord.cost,
      pricePerLiter: fuelRecord.pricePerLiter,
      odometer: fuelRecord.odometer,
      date: fuelRecord.date,
      station: fuelRecord.station ?? undefined,
      createdAt: fuelRecord.createdAt,
      updatedAt: fuelRecord.updatedAt,
    };
  }
}