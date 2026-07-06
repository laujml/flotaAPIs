export class MaintenanceResponseDto {
  id!: number;
  vehicleId!: number;
  type!: string;
  scheduledOdometer!: number | null;
  scheduledDate!: Date | null;
  completedDate!: Date | null;
  cost!: number;
  description!: string | null;
  isCompleted!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
