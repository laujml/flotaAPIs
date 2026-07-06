import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
  ) {}

  async create(data: CreateMaintenanceDto) {
    await this.vehiclesService.findById(data.vehicleId);

    return this.prisma.maintenance.create({
      data: {
        ...data,
        isCompleted: false,
      },
    });
  }

  async findAll() {
    return this.prisma.maintenance.findMany({
      include: { vehicle: true },
    });
  }

  async findByVehicle(vehicleId: number) {
    await this.vehiclesService.findById(vehicleId);

    return this.prisma.maintenance.findMany({
      where: { vehicleId },
      include: { vehicle: true },
    });
  }

  async findById(id: number) {
    const maintenance = await this.prisma.maintenance.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance record with ID ${id} not found`);
    }

    return maintenance;
  }

  async update(id: number, data: UpdateMaintenanceDto) {
    await this.findById(id);

    return this.prisma.maintenance.update({
      where: { id },
      data,
      include: { vehicle: true },
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prisma.maintenance.delete({
      where: { id },
    });
  }

  async completeMaintenance(
    id: number,
    cost: number,
  ) {
    if (cost < 0) {
      throw new BadRequestException('Cost cannot be negative');
    }

    const maintenance = await this.findById(id);

    await this.prisma.maintenance.update({
      where: { id },
      data: {
        isCompleted: true,
        completedDate: new Date(),
        cost,
      },
    });

    // Check if all maintenances for this vehicle are completed
    await this.updateVehicleMaintenanceStatus(maintenance.vehicleId);

    return this.findById(id);
  }

  async updateVehicleMaintenanceStatus(vehicleId: number) {
    const vehicle = await this.vehiclesService.findById(vehicleId);
    const pendingMaintenances = vehicle.maintenanceSchedule.filter(
      (m) => !m.isCompleted,
    );

    let newState = 'available';

    for (const maintenance of pendingMaintenances) {
      if (maintenance.scheduledOdometer && vehicle.currentOdometer >= maintenance.scheduledOdometer) {
        newState = 'maintenance_overdue';
        break;
      }

      if (maintenance.scheduledDate && new Date() > maintenance.scheduledDate) {
        newState = 'maintenance_overdue';
        break;
      }
    }

    if (newState !== vehicle.state && vehicle.state !== 'in_trip') {
      await this.vehiclesService.setVehicleState(vehicleId, newState as any);
    }
  }

  async getPendingMaintenances(vehicleId: number) {
    return this.prisma.maintenance.findMany({
      where: {
        vehicleId,
        isCompleted: false,
      },
      include: { vehicle: true },
    });
  }

  async getCompletedMaintenances(vehicleId: number) {
    return this.prisma.maintenance.findMany({
      where: {
        vehicleId,
        isCompleted: true,
      },
      include: { vehicle: true },
    });
  }
}
