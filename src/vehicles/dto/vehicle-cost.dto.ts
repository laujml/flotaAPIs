export class VehicleCostDto {
  vehicleId!: number;
  plate!: string;
  totalMaintenanceCost!: number;
  totalKmTraveled!: number;
  averageCostPerKm!: number;
  pendingMaintenanceCost!: number;
  lastMaintenanceDate!: Date | null;
  maintenanceCount!: number;
  costTrend!: 'stable' | 'increasing' | 'decreasing';
}
