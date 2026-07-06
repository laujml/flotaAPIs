import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VALID_STATE_TRANSITIONS, VehicleState, MAINTENANCE_ALERT_THRESHOLDS } from './vehicles.constants';
import { VehicleCostDto } from './dto/vehicle-cost.dto';

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

  async setVehicleState(id: number, newState: VehicleState) {
    const vehicle = await this.findById(id);

    if (!VALID_STATE_TRANSITIONS[vehicle.state as VehicleState]?.includes(newState)) {
      throw new BadRequestException(
        `Cannot transition from ${vehicle.state} to ${newState}. Valid transitions: ${VALID_STATE_TRANSITIONS[vehicle.state as VehicleState]?.join(', ')}`,
      );
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: { state: newState },
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
            severity: 'critical',
          });
        } else if (remainingKm <= MAINTENANCE_ALERT_THRESHOLDS.KM_WARNING) {
          alerts.push({
            type: 'APPROACHING',
            message: `Maintenance approaching in ${remainingKm} km`,
            maintenanceId: maintenance.id,
            severity: 'warning',
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
            severity: 'critical',
          });
        } else if (daysUntil <= MAINTENANCE_ALERT_THRESHOLDS.DAYS_WARNING) {
          alerts.push({
            type: 'DATE_APPROACHING',
            message: `Maintenance approaching in ${daysUntil} days`,
            maintenanceId: maintenance.id,
            severity: 'warning',
          });
        }
      }
    }

    return alerts;
  }

  async getVehicleCostAnalysis(id: number): Promise<VehicleCostDto> {
    const vehicle = await this.findById(id);
    const maintenances = vehicle.maintenanceSchedule;

    const completedMaintenances = maintenances.filter((m) => m.isCompleted);
    const totalMaintenanceCost = completedMaintenances.reduce((sum, m) => sum + m.cost, 0);
    const pendingMaintenanceCost = maintenances
      .filter((m) => !m.isCompleted)
      .reduce((sum, m) => sum + (m.cost || 0), 0);

    const totalKmTraveled = vehicle.currentOdometer;
    const averageCostPerKm = totalKmTraveled > 0 ? totalMaintenanceCost / totalKmTraveled : 0;

    const lastMaintenance = completedMaintenances.sort(
      (a, b) => b.completedDate!.getTime() - a.completedDate!.getTime(),
    )[0];

    const costTrend = this.calculateCostTrend(completedMaintenances);

    return {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      totalMaintenanceCost,
      totalKmTraveled,
      averageCostPerKm: Math.round(averageCostPerKm * 10000) / 10000,
      pendingMaintenanceCost,
      lastMaintenanceDate: lastMaintenance?.completedDate || null,
      maintenanceCount: completedMaintenances.length,
      costTrend,
    };
  }

  private calculateCostTrend(
    maintenances: any[],
  ): 'stable' | 'increasing' | 'decreasing' {
    if (maintenances.length < 2) return 'stable';

    const recent = maintenances.slice(0, Math.ceil(maintenances.length / 2));
    const older = maintenances.slice(Math.ceil(maintenances.length / 2));

    const recentAvg = recent.reduce((sum, m) => sum + m.cost, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.cost, 0) / older.length;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (percentChange > 10) return 'increasing';
    if (percentChange < -10) return 'decreasing';
    return 'stable';
  }

  async detectPerformanceAnomaly(id: number): Promise<any> {
    const vehicle = await this.findById(id);
    const maintenances = vehicle.maintenanceSchedule.filter((m) => m.isCompleted);

    if (maintenances.length < 3) {
      return { hasAnomaly: false, reason: 'Insufficient data' };
    }

    const costs = maintenances.map((m) => m.cost);
    const avgCost = costs.reduce((a, b) => a + b) / costs.length;
    const latestCost = costs[costs.length - 1];

    const percentageChange = ((latestCost - avgCost) / avgCost) * 100;

    if (Math.abs(percentageChange) > 15) {
      return {
        hasAnomaly: true,
        message: `Maintenance cost ${percentageChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentageChange).toFixed(2)}%`,
        severity: percentageChange > 0 ? 'warning' : 'info',
        recommendation:
          percentageChange > 0
            ? 'Schedule diagnostic maintenance to check for underlying issues'
            : 'Vehicle performing better than expected',
      };
    }

    return { hasAnomaly: false };
  }
}
