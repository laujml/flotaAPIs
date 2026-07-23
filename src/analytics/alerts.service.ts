import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlertDto } from './dto/alert.dto';

const GALON_A_LITROS = 3.78541;
const PERFORMANCE_ALERT_THRESHOLD = 0.15; // 15% - RN-07

/**
 * Servicio de alertas reutilizable.
 * Genera alertas de rendimiento (RN-07) y mantenimiento próximo.
 */
@Injectable()
export class AlertsService {
  constructor(private prisma: PrismaService) {}

  /**
   * RN-07: Si el rendimiento disminuye más del 15% respecto al promedio
   * histórico de la flota, el sistema genera una alerta.
   *
   * Usa consultas agregadas para calcular el rendimiento promedio de la flota
   * y luego compara cada vehículo individual.
   */
  async getPerformanceAlerts(): Promise<AlertDto[]> {
    // 1. Calcular rendimiento promedio de la flota con query agregada
    const fleetPerf = await this.prisma.$queryRaw<
      { vehicleId: number; km_per_gallon: number }[]
    >`
      SELECT
        t."vehicleId",
        (SUM(t.distance) / (SUM(fr.liters) * ${GALON_A_LITROS})) as km_per_gallon
      FROM "Trip" t
      INNER JOIN "FuelRecord" fr ON fr."tripId" = t.id
      WHERE t.status = 'completed'
        AND t."deletedAt" IS NULL
        AND t."endOdometer" IS NOT NULL
      GROUP BY t."vehicleId"
    `;

    if (fleetPerf.length === 0) return [];

    // Promedio de la flota
    const fleetAvg =
      fleetPerf.reduce((sum, v) => sum + v.km_per_gallon, 0) / fleetPerf.length;

    // 2. Detectar vehículos que caen >15% vs promedio
    const alerts: AlertDto[] = [];
    for (const vp of fleetPerf) {
      if (fleetAvg <= 0) continue;
      const dropPercent = (fleetAvg - vp.km_per_gallon) / fleetAvg;

      if (dropPercent > PERFORMANCE_ALERT_THRESHOLD) {
        const vehicle = await this.prisma.vehicle.findUnique({
          where: { id: vp.vehicleId },
          select: { plate: true },
        });

        alerts.push({
          type: 'PERFORMANCE',
          severity: dropPercent > 0.30 ? 'critical' : 'warning',
          vehicleId: vp.vehicleId,
          plate: vehicle?.plate || 'Unknown',
          message: `Rendimiento ${Math.round(dropPercent * 100)}% por debajo del promedio de flota (${Math.round(vp.km_per_gallon * 100) / 100} km/gal vs ${Math.round(fleetAvg * 100) / 100} km/gal promedio)`,
          details: {
            vehiclePerformance: Math.round(vp.km_per_gallon * 100) / 100,
            fleetAverage: Math.round(fleetAvg * 100) / 100,
            dropPercentage: Math.round(dropPercent * 10000) / 100,
            threshold: PERFORMANCE_ALERT_THRESHOLD * 100,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    return alerts;
  }

  /**
   * Genera alertas de mantenimiento próximo para todos los vehículos.
   * Reutiliza la lógica de umbrales del módulo de vehículos.
   */
  async getMaintenanceAlerts(): Promise<AlertDto[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        plate: true,
        currentOdometer: true,
        maintenanceSchedule: {
          where: { isCompleted: false, deletedAt: null },
          select: { id: true, scheduledOdometer: true, scheduledDate: true },
        },
      },
    });

    const alerts: AlertDto[] = [];
    const KM_WARNING = 500;
    const DAYS_WARNING = 7;

    for (const vehicle of vehicles) {
      for (const m of vehicle.maintenanceSchedule) {
        if (m.scheduledOdometer) {
          const remaining = m.scheduledOdometer - vehicle.currentOdometer;
          if (remaining <= 0) {
            alerts.push({
              type: 'MAINTENANCE',
              severity: 'critical',
              vehicleId: vehicle.id,
              plate: vehicle.plate,
              message: `Mantenimiento vencido por ${Math.abs(remaining)} km (odómetro: ${vehicle.currentOdometer}, programado: ${m.scheduledOdometer})`,
              details: { maintenanceId: m.id, remainingKm: remaining, currentOdometer: vehicle.currentOdometer, scheduledOdometer: m.scheduledOdometer },
              createdAt: new Date().toISOString(),
            });
          } else if (remaining <= KM_WARNING) {
            alerts.push({
              type: 'MAINTENANCE',
              severity: 'warning',
              vehicleId: vehicle.id,
              plate: vehicle.plate,
              message: `Mantenimiento próximo en ${remaining} km`,
              details: { maintenanceId: m.id, remainingKm: remaining },
              createdAt: new Date().toISOString(),
            });
          }
        }
        if (m.scheduledDate) {
          const days = Math.floor(
            (m.scheduledDate.getTime() - Date.now()) / 86400000,
          );
          if (days <= 0) {
            alerts.push({
              type: 'MAINTENANCE',
              severity: 'critical',
              vehicleId: vehicle.id,
              plate: vehicle.plate,
              message: `Mantenimiento vencido por ${Math.abs(days)} días`,
              details: { maintenanceId: m.id, daysUntil: days, scheduledDate: m.scheduledDate },
              createdAt: new Date().toISOString(),
            });
          } else if (days <= DAYS_WARNING) {
            alerts.push({
              type: 'MAINTENANCE',
              severity: 'warning',
              vehicleId: vehicle.id,
              plate: vehicle.plate,
              message: `Mantenimiento próximo en ${days} días`,
              details: { maintenanceId: m.id, daysUntil: days },
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return alerts;
  }

  /**
   * Obtiene todas las alertas (rendimiento + mantenimiento) para un vehículo específico.
   */
  async getVehicleAlerts(vehicleId: number): Promise<AlertDto[]> {
    const allPerf = await this.getPerformanceAlerts();
    const allMaint = await this.getMaintenanceAlerts();
    return [...allPerf, ...allMaint].filter((a) => a.vehicleId === vehicleId);
  }
}