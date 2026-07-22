import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleCostPerKmDto } from './dto/alert.dto';

/**
 * Servicio encargado de calcular el costo por kilómetro de cada vehículo.
 * Implementa la fórmula del documento de análisis (RN-08):
 *   Costo por kilómetro = (Combustible + Mantenimiento) / Kilómetros recorridos
 *
 * Utiliza consultas agregadas eficientes (GROUP BY, aggregate) con Prisma.
 */
@Injectable()
export class CostCalculatorService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula el costo por km de un vehículo específico.
   * Usa Prisma aggregate para obtener totales en una sola consulta.
   */
  async calculateCostPerKm(vehicleId: number): Promise<VehicleCostPerKmDto> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId, deletedAt: null },
      select: { id: true, plate: true, type: true, currentOdometer: true },
    });

    if (!vehicle) {
      throw new Error(`Vehicle with ID ${vehicleId} not found`);
    }

    // Consulta agregada: costo total de combustible
    const fuelAgg = await this.prisma.fuelRecord.aggregate({
      where: { vehicleId },
      _sum: { totalCost: true },
    });

    // Consulta agregada: costo total de mantenimiento completado
    const maintAgg = await this.prisma.maintenanceSchedule.aggregate({
      where: { vehicleId, isCompleted: true, deletedAt: null },
      _sum: { cost: true },
    });

    const totalFuelCost = fuelAgg._sum.totalCost || 0;
    const totalMaintenanceCost = maintAgg._sum.cost || 0;
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
    const totalKm = vehicle.currentOdometer;
    const costPerKm = totalKm > 0 ? totalOperationalCost / totalKm : 0;

    return {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      type: vehicle.type,
      totalFuelCost: Math.round(totalFuelCost * 100) / 100,
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalOperationalCost: Math.round(totalOperationalCost * 100) / 100,
      totalKmTraveled: totalKm,
      costPerKm: Math.round(costPerKm * 10000) / 10000,
    };
  }

  /**
   * Calcula el costo por km de TODOS los vehículos de la flota.
   * Usa consultas agregadas con GROUP BY para eficiencia.
   */
  async calculateFleetCostPerKm(): Promise<VehicleCostPerKmDto[]> {
    // Obtenemos todos los vehículos activos
    const vehicles = await this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: { id: true, plate: true, type: true, currentOdometer: true },
    });

    if (vehicles.length === 0) return [];

    const vehicleIds = vehicles.map((v) => v.id);

    // Consulta agregada GROUP BY para combustible por vehículo
    const fuelByVehicle = await this.prisma.fuelRecord.groupBy({
      by: ['vehicleId'],
      where: { vehicleId: { in: vehicleIds } },
      _sum: { totalCost: true },
    });

    // Consulta agregada GROUP BY para mantenimiento por vehículo
    const maintByVehicle = await this.prisma.maintenanceSchedule.groupBy({
      by: ['vehicleId'],
      where: { vehicleId: { in: vehicleIds }, isCompleted: true, deletedAt: null },
      _sum: { cost: true },
    });

    // Mapas de búsqueda rápida
    const fuelMap = new Map(fuelByVehicle.map((r) => [r.vehicleId, r._sum.totalCost || 0]));
    const maintMap = new Map(maintByVehicle.map((r) => [r.vehicleId, r._sum.cost || 0]));

    return vehicles.map((v) => {
      const fuelCost = fuelMap.get(v.id) || 0;
      const maintCost = maintMap.get(v.id) || 0;
      const total = fuelCost + maintCost;
      const km = v.currentOdometer;
      return {
        vehicleId: v.id,
        plate: v.plate,
        type: v.type,
        totalFuelCost: Math.round(fuelCost * 100) / 100,
        totalMaintenanceCost: Math.round(maintCost * 100) / 100,
        totalOperationalCost: Math.round(total * 100) / 100,
        totalKmTraveled: km,
        costPerKm: km > 0 ? Math.round((total / km) * 10000) / 10000 : 0,
      };
    });
  }
}