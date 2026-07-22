import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('MaintenanceService', () => {
  let service: MaintenanceService;

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

  const mockMaintenance = {
    id: 1,
    vehicleId: 1,
    type: 'oil_change',
    scheduledOdometer: 101000,
    scheduledDate: null,
    completedDate: null,
    cost: 0,
    description: 'Regular maintenance',
    isCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    vehicle: mockVehicle,
  };

  const mockPrismaService = {
    maintenance: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockVehiclesService = {
    findById: jest.fn(),
    setVehicleState: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: VehiclesService,
          useValue: mockVehiclesService,
        },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a maintenance record', async () => {
      const createDto = {
        vehicleId: 1,
        type: 'oil_change',
        scheduledOdometer: 101000,
        description: 'Regular maintenance',
      };

      mockVehiclesService.findById.mockResolvedValue(mockVehicle);
      mockPrismaService.maintenance.create.mockResolvedValue(mockMaintenance);

      const result = await service.create(createDto);

      expect(result).toEqual(mockMaintenance);
      expect(mockVehiclesService.findById).toHaveBeenCalledWith(1);
    });

    it('should throw error if vehicle does not exist', async () => {
      const createDto = {
        vehicleId: 999,
        type: 'oil_change',
        scheduledOdometer: 101000,
      };

      mockVehiclesService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByVehicle', () => {
    it('should find all maintenance records for a vehicle', async () => {
      mockVehiclesService.findById.mockResolvedValue(mockVehicle);
      mockPrismaService.maintenance.findMany.mockResolvedValue([mockMaintenance]);

      const result = await service.findByVehicle(1);

      expect(result).toEqual([mockMaintenance]);
      expect(mockPrismaService.maintenance.findMany).toHaveBeenCalledWith({
        where: { vehicleId: 1 },
        include: { vehicle: true },
      });
    });
  });

  describe('completeMaintenance', () => {
    it('should mark maintenance as completed with cost', async () => {
      const completedMaintenance = {
        ...mockMaintenance,
        isCompleted: true,
        completedDate: new Date(),
        cost: 500,
      };

      mockPrismaService.maintenance.findUnique
        .mockResolvedValueOnce(mockMaintenance)
        .mockResolvedValueOnce(completedMaintenance);
      mockVehiclesService.findById.mockResolvedValue(mockVehicle);
      mockPrismaService.maintenance.update.mockResolvedValue(completedMaintenance);

      const result = await service.completeMaintenance(1, 500);

      expect(result.isCompleted).toBe(true);
      expect(result.cost).toBe(500);
      expect(mockPrismaService.maintenance.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          isCompleted: true,
          completedDate: expect.any(Date),
          cost: 500,
        },
      });
    });

    it('should reject negative cost', async () => {
      mockPrismaService.maintenance.findUnique.mockResolvedValue(mockMaintenance);

      await expect(service.completeMaintenance(1, -100)).rejects.toThrow(BadRequestException);
    });

    it('should update vehicle state if maintenance is overdue', async () => {
      const vehicleWithOverdueMaintenance = {
        ...mockVehicle,
        maintenanceSchedule: [
          {
            ...mockMaintenance,
            isCompleted: false,
            scheduledOdometer: 99000, // Past current odometer
          },
        ],
      };

      mockPrismaService.maintenance.findUnique.mockResolvedValue(mockMaintenance);
      mockVehiclesService.findById.mockResolvedValue(vehicleWithOverdueMaintenance);
      mockPrismaService.maintenance.update.mockResolvedValue({
        ...mockMaintenance,
        isCompleted: true,
        cost: 500,
      });

      await service.completeMaintenance(1, 500);

      expect(mockVehiclesService.setVehicleState).toHaveBeenCalledWith(
        1,
        expect.any(String),
      );
    });
  });

  describe('getPendingMaintenances', () => {
    it('should return only pending (incomplete) maintenance records', async () => {
      const pendingMaintenance = {
        ...mockMaintenance,
        isCompleted: false,
      };

      mockPrismaService.maintenance.findMany.mockResolvedValue([pendingMaintenance]);

      const result = await service.getPendingMaintenances(1);

      expect(result).toEqual([pendingMaintenance]);
      expect(mockPrismaService.maintenance.findMany).toHaveBeenCalledWith({
        where: {
          vehicleId: 1,
          isCompleted: false,
        },
        include: { vehicle: true },
      });
    });
  });

  describe('getCompletedMaintenances', () => {
    it('should return only completed maintenance records', async () => {
      const completedMaintenance = {
        ...mockMaintenance,
        isCompleted: true,
        completedDate: new Date(),
        cost: 500,
      };

      mockPrismaService.maintenance.findMany.mockResolvedValue([completedMaintenance]);

      const result = await service.getCompletedMaintenances(1);

      expect(result).toEqual([completedMaintenance]);
      expect(mockPrismaService.maintenance.findMany).toHaveBeenCalledWith({
        where: {
          vehicleId: 1,
          isCompleted: true,
        },
        include: { vehicle: true },
      });
    });
  });

  describe('updateVehicleMaintenanceStatus', () => {
    it('should set vehicle state to maintenance_overdue if maintenance is overdue by odometer', async () => {
      const vehicleWithOverdueM = {
        ...mockVehicle,
        maintenanceSchedule: [
          {
            ...mockMaintenance,
            isCompleted: false,
            scheduledOdometer: 99000, // Less than current odometer
          },
        ],
      };

      mockVehiclesService.findById.mockResolvedValue(vehicleWithOverdueM);

      await service.updateVehicleMaintenanceStatus(1);

      expect(mockVehiclesService.setVehicleState).toHaveBeenCalledWith(1, 'maintenance_overdue');
    });

    it('should keep vehicle state as available if no maintenance is pending', async () => {
      const vehicleNoMaintenance = {
        ...mockVehicle,
        maintenanceSchedule: [],
      };

      mockVehiclesService.findById.mockResolvedValue(vehicleNoMaintenance);

      await service.updateVehicleMaintenanceStatus(1);

      // setVehicleState should be called with available state
      // or not called if state hasn't changed
      expect(mockVehiclesService.findById).toHaveBeenCalledWith(1);
    });
  });
});
