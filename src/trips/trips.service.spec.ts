import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { FuelRecordsService } from '../fuel-records/fuel-records.service';

describe('TripsService', () => {
  let service: TripsService;

  const mockPrismaService = {
    driver: {
      findUnique: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    trip: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockFuelRecordsService = {
    calculateTripPerformance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FuelRecordsService, useValue: mockFuelRecordsService },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    jest.clearAllMocks();
  });

  it('should create a trip and mark the vehicle as in use', async () => {
    const driver = { id: 1, isActive: true };
    const vehicle = { id: 1, state: 'available', currentOdometer: 50000 };
    const trip = {
      id: 10,
      driverId: 1,
      vehicleId: 1,
      origin: 'A',
      destination: 'B',
      distance: 120,
      cargoWeight: 500,
      startOdometer: 50000,
      startDate: new Date(),
      status: 'planned',
      createdAt: new Date(),
      updatedAt: new Date(),
      driver: { id: 1, name: 'Driver', licenseNumber: 'LIC-1' },
      vehicle: { id: 1, plate: 'ABC-123', type: 'truck' },
    };

    mockPrismaService.driver.findUnique.mockResolvedValue(driver);
    mockPrismaService.vehicle.findUnique.mockResolvedValue(vehicle);
    mockPrismaService.trip.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrismaService.trip.create.mockResolvedValue(trip);
    mockPrismaService.vehicle.update.mockResolvedValue({ ...vehicle, state: 'in_use' });

    const result = await service.create({
      driverId: 1,
      vehicleId: 1,
      origin: 'A',
      destination: 'B',
      distance: 120,
      cargoWeight: 500,
    });

    expect(result.id).toBe(10);
    expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { state: 'in_use' },
    });
  });

  it('should reject trip creation when vehicle is not available', async () => {
    mockPrismaService.driver.findUnique.mockResolvedValue({ id: 1, isActive: true });
    mockPrismaService.vehicle.findUnique.mockResolvedValue({ id: 1, state: 'in_maintenance' });

    await expect(
      service.create({
        driverId: 1,
        vehicleId: 1,
        origin: 'A',
        destination: 'B',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should complete a trip inside a transaction and update the vehicle odometer', async () => {
    const activeTrip = {
      id: 10,
      driverId: 1,
      vehicleId: 1,
      origin: 'A',
      destination: 'B',
      distance: 120,
      cargoWeight: 500,
      startOdometer: 50000,
      endOdometer: null,
      startDate: new Date(),
      endDate: null,
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      driver: { id: 1, name: 'Driver', licenseNumber: 'LIC-1' },
      vehicle: { id: 1, plate: 'ABC-123', type: 'truck' },
    };

    const updatedTrip = {
      ...activeTrip,
      endOdometer: 50120,
      endDate: new Date(),
      status: 'completed',
    };

    const txMock = {
      trip: {
        findFirst: jest.fn().mockResolvedValue(activeTrip),
        update: jest.fn().mockResolvedValue(updatedTrip),
      },
      vehicle: {
        update: jest.fn().mockResolvedValue({ id: 1, state: 'available', currentOdometer: 50120 }),
      },
    };

    mockPrismaService.$transaction.mockImplementation(async (callback: any) => callback(txMock));
    mockFuelRecordsService.calculateTripPerformance.mockResolvedValue({
      totalLiters: 20,
      totalCost: 100,
      distanceKm: 120,
      kmPerLiter: 6,
      kmPerGallon: 22.71,
      averagePricePerLiter: 5,
    });

    const result = await service.completeTrip(10, 50120);

    expect(result.status).toBe('completed');
    expect(result.performance?.kmPerGallon).toBe(22.71);
    expect(txMock.vehicle.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        state: 'available',
        currentOdometer: 50120,
      },
    });
  });
});
