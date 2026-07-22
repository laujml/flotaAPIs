import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from './vehicles.service';

@Injectable()
export class FleetReportService {
  constructor(
    private prisma: PrismaService,
    private vehiclesService: VehiclesService,
  ) {}

  async getFleetEfficiencyReport() {
    const vehicles = await this.prisma.vehicle.findMany({
      include: { maintenanceSchedule: true },
    });

    const vehicleStats = await Promise.all(
      vehicles.map(async (v) => {
        const costAnalysis = await this.vehiclesService.getVehicleCostAnalysis(v.id);
        return costAnalysis;
      }),
    );

    const sortedByEfficiency = vehicleStats.sort(
      (a, b) => a.averageCostPerKm - b.averageCostPerKm,
    );

    const totalFleetCost = vehicleStats.reduce((sum, v) => sum + v.totalMaintenanceCost, 0);
    const totalFleetKm = vehicleStats.reduce((sum, v) => sum + v.totalKmTraveled, 0);
    const averageFleetCost = totalFleetKm > 0 ? totalFleetCost / totalFleetKm : 0;

    const vehiclesNeedingAttention = vehicleStats.filter(
      (v) => v.averageCostPerKm > averageFleetCost * 1.5,
    );

    return {
      summary: {
        totalVehicles: vehicles.length,
        totalFleetCost,
        totalFleetKm,
        averageFleetCostPerKm: Math.round(averageFleetCost * 10000) / 10000,
      },
      ranking: sortedByEfficiency,
      vehiclesNeedingAttention: vehiclesNeedingAttention.map((v) => ({
        ...v,
        costOverage: Math.round(
          (v.averageCostPerKm - averageFleetCost) / averageFleetCost * 100
        ),
      })),
      recommendations: this.generateRecommendations(
        vehiclesNeedingAttention,
        averageFleetCost,
      ),
    };
  }

  async getVehicleComparisonReport(vehicleId: number) {
    const vehicle = await this.vehiclesService.findById(vehicleId);
    const vehicleStats = await this.vehiclesService.getVehicleCostAnalysis(vehicleId);

    const allVehicles = await this.prisma.vehicle.findMany({
      where: { type: vehicle.type },
      include: { maintenanceSchedule: true },
    });

    const allStats = await Promise.all(
      allVehicles.map((v) => this.vehiclesService.getVehicleCostAnalysis(v.id)),
    );

    const typeSimilarVehicles = allStats.filter((s) => s.vehicleId !== vehicleId);
    const avgCostSimilarType =
      typeSimilarVehicles.reduce((sum, s) => sum + s.averageCostPerKm, 0) /
      typeSimilarVehicles.length;

    return {
      vehicle: vehicleStats,
      typeComparison: {
        vehicleType: vehicle.type,
        vehiclesInType: typeSimilarVehicles.length + 1,
        avgCostPerKmInType: Math.round(avgCostSimilarType * 10000) / 10000,
        performanceRating:
          vehicleStats.averageCostPerKm < avgCostSimilarType ? 'above_average' : 'below_average',
        percentageDifference: Math.round(
          ((vehicleStats.averageCostPerKm - avgCostSimilarType) / avgCostSimilarType) * 100 * 100
        ) / 100,
      },
    };
  }

  private generateRecommendations(
    vehiclesNeedingAttention: any[],
  ): string[] {
    const recommendations: string[] = [];

    if (vehiclesNeedingAttention.length === 0) {
      return ['Fleet is operating efficiently. Continue regular maintenance schedule.'];
    }

    if (vehiclesNeedingAttention.length >= 3) {
      recommendations.push(
        'Multiple vehicles showing high maintenance costs. Consider fleet-wide diagnostic review.',
      );
    }

    for (const vehicle of vehiclesNeedingAttention) {
      if (vehicle.costTrend === 'increasing') {
        recommendations.push(
          `Vehicle ${vehicle.plate}: Maintenance costs are increasing. Schedule preventive service.`,
        );
      }
    }

    return recommendations;
  }
}
