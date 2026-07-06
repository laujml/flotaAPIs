import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prismaService: PrismaService;

  const mockVehicle = {
    id: 1,
    plate: 'ABC123',
    type: 'truck',
    capacity: 5000,
    currentOdometer: 100000,
    state: 'available',
    createdAt: new Date(),
    updatedAt: new Date(),
    maintenanceSchedule: [],
  };

  const mockPrismaService = {
    vehicle: {
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
        VehiclesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a vehicle with initial state available', async () => {
      const createDto = {
        plate: 'ABC123',
        type: 'truck',
        capacity: 5000,
      };

      mockPrismaService.vehicle.create.mockResolvedValue(mockVehicle);

      const result = await service.create(createDto);

      expect(result).toEqual(mockVehicle);
      expect(mockPrismaService.vehicle.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          currentOdometer: 0,
          state: 'available',
        },
      });
    });

    it('should create a vehicle with custom odometer value', async () => {
      const createDto = {
        plate: 'ABC123',
        type: 'truck',
        capacity: 5000,
        currentOdometer: 50000,
      };

      mockPrismaService.vehicle.create.mockResolvedValue({
        ...mockVehicle,
        currentOdometer: 50000,
      });

      const result = await service.create(createDto);

      expect(result.currentOdometer).toBe(50000);
    });
  });

  describe('findAll', () => {
    it('should return all vehicles with maintenance schedules', async () => {
      mockPrismaService.vehicle.findMany.mockResolvedValue([mockVehicle]);

      const result = await service.findAll();

      expect(result).toEqual([mockVehicle]);
      expect(mockPrismaService.vehicle.findMany).toHaveBeenCalledWith({
        include: { maintenanceSchedule: true },
      });
    });
  });

  describe('findById', () => {
    it('should return a vehicle by id', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);

      const result = await service.findById(1);

      expect(result).toEqual(mockVehicle);
      expect(mockPrismaService.vehicle.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { maintenanceSchedule: true },
      });
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOdometer', () => {
    it('should update odometer by adding distance', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);
      mockPrismaService.vehicle.update.mockResolvedValue({
        ...mockVehicle,
        currentOdometer: 100500,
      });

      const result = await service.updateOdometer(1, 500);

      expect(result.currentOdometer).toBe(100500);
      expect(mockPrismaService.vehicle.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { currentOdometer: 100500 },
        include: { maintenanceSchedule: true },
      });
    });

    it('should reject negative distance', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);

      await expect(service.updateOdometer(1, -100)).rejects.toThrow(BadRequestException);
    });
  });

  describe('canAssignForTrip', () => {
    it('should return true when vehicle is available', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue(mockVehicle);

      const result = await service.canAssignForTrip(1);

      expect(result).toBe(true);
    });

    it('should return false when vehicle is in maintenance', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        state: 'in_maintenance',
      });

      const result = await service.canAssignForTrip(1);

      expect(result).toBe(false);
    });

    it('should return false when vehicle has maintenance overdue', async () => {
      mockPrismaService.vehicle.findUnique.mockResolvedValue({
        ...mockVehicle,
        state: 'maintenance_overdue',
      });

      const result = await service.canAssignForTrip(1);

      expect(result).toBe(false);
    });
  });

  describe('checkMaintenanceAlerts', () => {
    it('should detect approaching maintenance by odometer', async () => {
      const vehicleWithMaintenance = {
        ...mockVehicle,
        maintenanceSchedule: [
          {
            id: 1,
            vehicleId: 1,
            type: 'oil_change',
            scheduledOdometer: 100250,
            scheduledDate: null,
            completedDate: null,
            cost: 0,
            description: null,
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrismaService.vehicle.findUnique.mockResolvedValue(vehicleWithMaintenance);

      const result = await service.checkMaintenanceAlerts(1);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('APPROACHING');
      expect(result[0].message).toContain('250');
    });

    it('should detect overdue maintenance by odometer', async () => {
      const vehicleWithMaintenance = {
        ...mockVehicle,
        maintenanceSchedule: [
          {
            id: 1,
            vehicleId: 1,
            type: 'oil_change',
            scheduledOdometer: 99000,
            scheduledDate: null,
            completedDate: null,
            cost: 0,
            description: null,
            isCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrismaService.vehicle.findUnique.mockResolvedValue(vehicleWithMaintenance);

      const result = await service.checkMaintenanceAlerts(1);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('OVERDUE');
    });

    it('should not alert for completed maintenance', async () => {
      const vehicleWithMaintenance = {
        ...mockVehicle,
        maintenanceSchedule: [
          {
            id: 1,
            vehicleId: 1,
            type: 'oil_change',
            scheduledOdometer: 99000,
            scheduledDate: null,
            completedDate: new Date(),
            cost: 500,
            description: null,
            isCompleted: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrismaService.vehicle.findUnique.mockResolvedValue(vehicleWithMaintenance);

      const result = await service.checkMaintenanceAlerts(1);

      expect(result).toHaveLength(0);
    });
  });
});
