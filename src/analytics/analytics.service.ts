import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FuelRecordsService } from '../fuel-records/fuel-records.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { VehicleEfficiencyDto } from './dto/vehicle-efficiency.dto';
import { DriverPerformanceDto } from './dto/driver-performance.dto';
import { CostCalculatorService } from './cost-calculator.service';

const GALON_A_LITROS = 3.78541;

/**
 * Servicio principal de Analytics/Reportes para dashboards.
 * Implementa consultas agregadas eficientes (GROUP BY, JOIN, subqueries).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private fuelRecordsService: FuelRecordsService,
    private costCalculator: CostCalculatorService,
  ) {}

  /**
   * Endpoint: GET /analytics/dashboard/summary
   * Resumen general de la flota con indicadores clave.
   */
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    // Conteo de vehículos por estado con GROUP BY
    const vehiclesByState = await this.prisma.vehicle.groupBy({
      by: ['state'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const totalVehicles = vehiclesByState.reduce((s, v) => s + v._count.id, 0);
    const vehiclesInTransit =
      vehiclesByState.find((v) => v.state === 'in_use' || v.state === 'in_trip')?._count.id || 0;
    const vehiclesInMaintenance =
      (vehiclesByState.find((v) => v.state === 'in_maintenance')?._count.id || 0) +
      (vehiclesByState.find((v) => v.state === 'maintenance_overdue')?._count.id || 0);
    const vehiclesAvailable =
      vehiclesByState.find((v) => v.state === 'available')?._count.id || 0;
    const fleetAvailabilityPercent =
      totalVehicles > 0 ? Math.round((vehiclesAvailable / totalVehicles) * 10000) / 100 : 0;

    // Totales agregados
    const totalKmAgg = await this.prisma.vehicle.aggregate({
      where: { deletedAt: null },
      _sum: { currentOdometer: true },
    });

    const fuelCostAgg = await this.prisma.fuelRecord.aggregate({
      _sum: { cost: true },
    });

    const maintCostAgg = await this.prisma.maintenance.aggregate({
      where: { isCompleted: true, deletedAt: null },
      _sum: { cost: true },
    });

    const totalKm = totalKmAgg._sum.currentOdometer || 0;
    const totalFuelCost = fuelCostAgg._sum.cost || 0;
    const totalMaintenanceCost = maintCostAgg._sum.cost || 0;
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
    const avgCostPerKm = totalKm > 0 ? totalOperationalCost / totalKm : 0;

    // Rendimiento promedio de flota (km/galón) - query con JOIN
    const fleetPerf = await this.prisma.$queryRaw<{ km_per_gallon: number }[]>`
      SELECT
        (SUM(t.distance) / (SUM(fr.liters) * ${GALON_A_LITROS})) as km_per_gallon
      FROM trips t
      INNER JOIN fuel_records fr ON fr."tripId" = t.id
      WHERE t.status = 'completed'
        AND t."deletedAt" IS NULL
    `;

    const avgPerformance = fleetPerf[0]?.km_per_gallon || 0;

    return {
      totalVehicles,
      vehiclesInTransit,
      vehiclesAvailable,
      vehiclesInMaintenance,
      fleetAvailabilityPercent,
      totalKmTraveled: totalKm,
      totalFuelCost: Math.round(totalFuelCost * 100) / 100,
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalOperationalCost: Math.round(totalOperationalCost * 100) / 100,
      averageFleetCostPerKm: Math.round(avgCostPerKm * 10000) / 10000,
      averageFleetPerformanceKmPerGallon: Math.round(avgPerformance * 100) / 100,
    };
  }

  /**
   * Endpoint: GET /analytics/dashboard/top-vehicles
   * Ranking de vehículos por eficiencia (menor costo operativo por km).
   * Usa consultas GROUP BY para obtener costos agregados.
   */
  async getTopVehicles(limit = 10): Promise<VehicleEfficiencyDto[]> {
    const costs = await this.costCalculator.calculateFleetCostPerKm();

    // Obtener conteo de viajes y rendimiento por vehículo con GROUP BY
    const tripStats = await this.prisma.trip.groupBy({
      by: ['vehicleId'],
      where: { status: 'completed', deletedAt: null },
      _count: { id: true },
      _sum: { distance: true },
    });

    const tripMap = new Map(
      tripStats.map((t) => [
        t.vehicleId,
        { count: t._count.id, distance: t._sum.distance || 0 },
      ]),
    );

    const maintCount = await this.prisma.maintenance.groupBy({
      by: ['vehicleId'],
      where: { isCompleted: true, deletedAt: null },
      _count: { id: true },
    });

    const maintMap = new Map(
      maintCount.map((m) => [m.vehicleId, m._count.id]),
    );

    // Rendimiento por vehículo (km/galón) con query JOIN
    const perfByVehicle = await this.prisma.$queryRaw<{
      vehicleId: number;
      km_per_gallon: number;
    }[]>`
      SELECT
        t."vehicleId",
        (SUM(t.distance) / (SUM(fr.liters) * ${GALON_A_LITROS})) as km_per_gallon
      FROM trips t
      INNER JOIN fuel_records fr ON fr."tripId" = t.id
      WHERE t.status = 'completed' AND t."deletedAt" IS NULL
      GROUP BY t."vehicleId"
    `;

    const perfMap = new Map(
      perfByVehicle.map((p) => [p.vehicleId, p.km_per_gallon]),
    );

    // Combinar y ordenar por costo por km (ascendente = más eficiente)
    const results: VehicleEfficiencyDto[] = costs
      .map((c) => ({
        vehicleId: c.vehicleId,
        plate: c.plate,
        type: c.type,
        totalKmTraveled: c.totalKmTraveled,
        totalFuelCost: c.totalFuelCost,
        totalMaintenanceCost: c.totalMaintenanceCost,
        totalOperationalCost: c.totalOperationalCost,
        costPerKm: c.costPerKm,
        averagePerformanceKmPerGallon:
          Math.round((perfMap.get(c.vehicleId) || 0) * 100) / 100,
        completedTrips: tripMap.get(c.vehicleId)?.count || 0,
        maintenanceCount: maintMap.get(c.vehicleId) || 0,
        rank: 0,
      }))
      .sort((a, b) => a.costPerKm - b.costPerKm);

    // Asignar ranking
    results.forEach((r, i) => (r.rank = i + 1));

    return results.slice(0, limit);
  }

  /**
   * Endpoint: GET /analytics/dashboard/top-drivers
   * Ranking de conductores por desempeño (más viajes, mejor rendimiento combustible).
   * Usa consultas GROUP BY con JOIN.
   */
  async getTopDrivers(limit = 10): Promise<DriverPerformanceDto[]> {
    // Query agregada con JOIN para obtener métricas por conductor
    const driverStats = await this.prisma.$queryRaw<
      {
        driverId: number;
        name: string;
        licenseNumber: string;
        completedTrips: number;
        totalKm: number;
        totalFuelCost: number;
        km_per_gallon: number;
      }[]
    >`
      SELECT
        d.id as "driverId",
        d.name,
        d."licenseNumber",
        COUNT(t.id) as "completedTrips",
        COALESCE(SUM(t.distance), 0) as "totalKm",
        COALESCE(SUM(fr_agg.total_fuel), 0) as "totalFuelCost",
        CASE
          WHEN SUM(fr_agg.total_liters) > 0
          THEN (SUM(t.distance) / (SUM(fr_agg.total_liters) * ${GALON_A_LITROS}))
          ELSE 0
        END as "km_per_gallon"
      FROM drivers d
      LEFT JOIN trips t ON t."driverId" = d.id AND t.status = 'completed' AND t."deletedAt" IS NULL
      LEFT JOIN (
        SELECT fr."tripId", SUM(fr.liters) as total_liters, SUM(fr.cost) as total_fuel
        FROM fuel_records fr
        GROUP BY fr."tripId"
      ) fr_agg ON fr_agg."tripId" = t.id
      WHERE d."deletedAt" IS NULL
      GROUP BY d.id, d.name, d."licenseNumber"
      HAVING COUNT(t.id) > 0
      ORDER BY "km_per_gallon" DESC
    `;

    return driverStats.slice(0, limit).map((d, i) => ({
      driverId: d.driverId,
      name: d.name,
      licenseNumber: d.licenseNumber,
      completedTrips: d.completedTrips,
      totalKmDriven: Math.round(d.totalKm * 100) / 100,
      totalFuelCost: Math.round(d.totalFuelCost * 100) / 100,
      averagePerformanceKmPerGallon: Math.round(d.km_per_gallon * 100) / 100,
      rank: i + 1,
    }));
  }

  /**
   * Reporte de eficiencia de flota: ranking completo de vehículos por costo operativo.
   */
  async getFleetEfficiencyRanking(): Promise<VehicleEfficiencyDto[]> {
    return this.getTopVehicles(999);
  }
}