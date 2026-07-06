import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        ...data,
        currentOdometer: data.currentOdometer || 0,
        state: 'available',
      },
    });
  }

  async findAll() {
    return this.prisma.vehicle.findMany({
      include: { maintenanceSchedule: true },
    });
  }

  async findById(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { maintenanceSchedule: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return vehicle;
  }

  async update(id: number, data: UpdateVehicleDto) {
    await this.findById(id);

    return this.prisma.vehicle.update({
      where: { id },
      data,
      include: { maintenanceSchedule: true },
    });
  }

  async delete(id: number) {
    await this.findById(id);

    return this.prisma.vehicle.delete({
      where: { id },
    });
  }

  async updateOdometer(id: number, distance: number) {
    const vehicle = await this.findById(id);

    if (distance < 0) {
      throw new BadRequestException('Distance cannot be negative');
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        currentOdometer: vehicle.currentOdometer + distance,
      },
      include: { maintenanceSchedule: true },
    });
  }

  async canAssignForTrip(id: number): Promise<boolean> {
    const vehicle = await this.findById(id);

    if (vehicle.state === 'in_maintenance' || vehicle.state === 'maintenance_overdue') {
      return false;
    }

    return true;
  }

  async setVehicleState(id: number, state: 'available' | 'in_trip' | 'in_maintenance' | 'maintenance_overdue') {
    return this.prisma.vehicle.update({
      where: { id },
      data: { state },
      include: { maintenanceSchedule: true },
    });
  }

  async checkMaintenanceAlerts(id: number) {
    const vehicle = await this.findById(id);
    const pendingMaintenances = vehicle.maintenanceSchedule.filter(
      (m) => !m.isCompleted,
    );

    const alerts = [];

    for (const maintenance of pendingMaintenances) {
      if (maintenance.scheduledOdometer) {
        const remainingKm = maintenance.scheduledOdometer - vehicle.currentOdometer;

        if (remainingKm <= 0) {
          alerts.push({
            type: 'OVERDUE',
            message: `Maintenance is overdue by ${Math.abs(remainingKm)} km`,
            maintenanceId: maintenance.id,
          });
        } else if (remainingKm <= 500) {
          alerts.push({
            type: 'APPROACHING',
            message: `Maintenance approaching in ${remainingKm} km`,
            maintenanceId: maintenance.id,
          });
        }
      }

      if (maintenance.scheduledDate) {
        const today = new Date();
        const daysUntil = Math.floor(
          (maintenance.scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntil <= 0) {
          alerts.push({
            type: 'DATE_OVERDUE',
            message: `Maintenance overdue by ${Math.abs(daysUntil)} days`,
            maintenanceId: maintenance.id,
          });
        } else if (daysUntil <= 7) {
          alerts.push({
            type: 'DATE_APPROACHING',
            message: `Maintenance approaching in ${daysUntil} days`,
            maintenanceId: maintenance.id,
          });
        }
      }
    }

    return alerts;
  }
}
