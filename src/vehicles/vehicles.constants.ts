export type VehicleState = 'available' | 'in_trip' | 'in_maintenance' | 'maintenance_overdue';

export const VALID_STATE_TRANSITIONS: Record<VehicleState, VehicleState[]> = {
  available: ['in_trip', 'in_maintenance'],
  in_trip: ['available', 'in_maintenance'],
  in_maintenance: ['available', 'maintenance_overdue'],
  maintenance_overdue: ['in_maintenance'],
};

export const MAINTENANCE_ALERT_THRESHOLDS = {
  KM_WARNING: 500,
  DAYS_WARNING: 7,
};
