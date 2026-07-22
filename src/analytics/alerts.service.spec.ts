import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AlertsService', () => {
  let service: AlertsService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    vehicle: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    jest.clearAllMocks();
  });

  it('should generate performance alerts when a vehicle drops more than 15 percent below average', async () => {
    mockPrismaService.$queryRaw.mockResolvedValue([
      { vehicleId: 1, km_per_gallon: 10 },
      { vehicleId: 2, km_per_gallon: 15 },
    ]);
    mockPrismaService.vehicle.findUnique.mockResolvedValue({ plate: 'ABC-001' });

    const result = await service.getPerformanceAlerts();

    expect(result).toHaveLength(1);
    expect(result[0].vehicleId).toBe(1);
    expect(result[0].type).toBe('PERFORMANCE');
    expect(result[0].message).toContain('por debajo del promedio');
  });

  it('should generate maintenance alerts for overdue odometer maintenance', async () => {
    mockPrismaService.vehicle.findMany.mockResolvedValue([
      {
        id: 1,
        plate: 'ABC-001',
        currentOdometer: 1000,
        maintenanceSchedule: [
          {
            id: 10,
            scheduledOdometer: 900,
            scheduledDate: null,
          },
        ],
      },
    ]);

    const result = await service.getMaintenanceAlerts();

    expect(result).toHaveLength(1);
    expect(result[0].vehicleId).toBe(1);
    expect(result[0].type).toBe('MAINTENANCE');
    expect(result[0].severity).toBe('critical');
  });

  it('should filter alerts by vehicle id', async () => {
    jest.spyOn(service, 'getPerformanceAlerts').mockResolvedValue([
      { type: 'PERFORMANCE', severity: 'warning', vehicleId: 1, plate: 'ABC-001', message: 'x', details: {}, createdAt: new Date().toISOString() },
      { type: 'PERFORMANCE', severity: 'warning', vehicleId: 2, plate: 'ABC-002', message: 'y', details: {}, createdAt: new Date().toISOString() },
    ]);
    jest.spyOn(service, 'getMaintenanceAlerts').mockResolvedValue([
      { type: 'MAINTENANCE', severity: 'critical', vehicleId: 1, plate: 'ABC-001', message: 'z', details: {}, createdAt: new Date().toISOString() },
    ]);

    const result = await service.getVehicleAlerts(1);

    expect(result).toHaveLength(2);
    expect(result.every((alert) => alert.vehicleId === 1)).toBe(true);
  });
});
