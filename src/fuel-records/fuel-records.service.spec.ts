import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FuelRecordsService } from './fuel-records.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FuelRecordsService', () => {
  let service: FuelRecordsService;

  const mockPrismaService = {
    trip: {
      findUnique: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
    },
    fuelRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuelRecordsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FuelRecordsService>(FuelRecordsService);
    jest.clearAllMocks();
  });

  it('should create a fuel record when trip and vehicle match', async () => {
    mockPrismaService.trip.findUnique.mockResolvedValue({
      id: 10,
      vehicleId: 1,
      startOdometer: 1000,
      endOdometer: 1200,
    });
    mockPrismaService.vehicle.findUnique.mockResolvedValue({ id: 1 });
    mockPrismaService.fuelRecord.create.mockResolvedValue({
      id: 1,
      tripId: 10,
      vehicleId: 1,
      liters: 20,
      cost: 100,
      pricePerLiter: 5,
      odometer: 1100,
      date: new Date('2026-07-21T00:00:00.000Z'),
      station: 'Central',
      createdAt: new Date(),
      updatedAt: new Date(),
      trip: {},
      vehicle: {},
    });

    const result = await service.create({
      tripId: 10,
      vehicleId: 1,
      liters: 20,
      cost: 100,
      pricePerLiter: 5,
      odometer: 1100,
      station: 'Central',
    });

    expect(result.tripId).toBe(10);
    expect(mockPrismaService.fuelRecord.create).toHaveBeenCalledWith({
      data: {
        tripId: 10,
        vehicleId: 1,
        liters: 20,
        cost: 100,
        pricePerLiter: 5,
        odometer: 1100,
        date: expect.any(Date),
        station: 'Central',
      },
      include: {
        trip: true,
        vehicle: true,
      },
    });
  });

  it('should reject a fuel record when odometer is below trip start', async () => {
    mockPrismaService.trip.findUnique.mockResolvedValue({
      id: 10,
      vehicleId: 1,
      startOdometer: 1000,
      endOdometer: 1200,
    });
    mockPrismaService.vehicle.findUnique.mockResolvedValue({ id: 1 });

    await expect(
      service.create({
        tripId: 10,
        vehicleId: 1,
        liters: 20,
        cost: 100,
        pricePerLiter: 5,
        odometer: 900,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should calculate trip performance from fuel records', async () => {
    mockPrismaService.trip.findUnique.mockResolvedValue({
      id: 10,
      startOdometer: 1000,
      endOdometer: 1200,
      fuelRecords: [
        { liters: 10, cost: 50 },
        { liters: 15, cost: 75 },
      ],
    });

    const result = await service.calculateTripPerformance(10);

    expect(result.totalLiters).toBe(25);
    expect(result.totalCost).toBe(125);
    expect(result.distanceKm).toBe(200);
    expect(result.kmPerLiter).toBe(8);
    expect(result.kmPerGallon).toBeCloseTo(30.28, 2);
  });

  it('should reject performance calculation when trip is not completed', async () => {
    mockPrismaService.trip.findUnique.mockResolvedValue({
      id: 10,
      startOdometer: 1000,
      endOdometer: null,
      fuelRecords: [],
    });

    await expect(service.calculateTripPerformance(10)).rejects.toThrow(BadRequestException);
  });

  it('should throw when trip is not found', async () => {
    mockPrismaService.trip.findUnique.mockResolvedValue(null);

    await expect(service.findByTripId(999)).rejects.toThrow(NotFoundException);
  });
});
