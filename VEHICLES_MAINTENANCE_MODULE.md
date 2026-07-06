# Vehicles & Maintenance Module

## Overview

This module handles vehicle fleet management including CRUD operations, state management, preventive maintenance scheduling, and maintenance alerts.

## Architecture

### Database Schema

#### Vehicle Entity
- `id`: Primary key
- `plate`: Unique vehicle plate identifier
- `type`: Vehicle type (e.g., truck, van)
- `capacity`: Load capacity in kg
- `currentOdometer`: Current odometer reading
- `state`: Vehicle state (available, in_trip, in_maintenance, maintenance_overdue)
- `maintenanceSchedule`: Relationship to maintenance records

#### Maintenance Entity
- `id`: Primary key
- `vehicleId`: Foreign key to Vehicle
- `type`: Maintenance type
- `scheduledOdometer`: Odometer at which maintenance should occur
- `scheduledDate`: Date when maintenance should occur
- `completedDate`: When maintenance was actually completed
- `cost`: Maintenance cost
- `isCompleted`: Completion status

## Key Features

### Vehicle Management
- **CRUD Operations**: Create, read, update, delete vehicles
- **Odometer Tracking**: Automatically update vehicle odometer on trip completion
- **State Management**: Track vehicle states (available, in_trip, in_maintenance, maintenance_overdue)
- **Trip Assignment Validation**: Block vehicle assignment if in maintenance or overdue

### Maintenance Management
- **Preventive Maintenance**: Schedule based on odometer or date
- **Maintenance Alerts**: 
  - Alert when maintenance is approaching (500 km or 7 days before)
  - Alert when maintenance is overdue
- **Maintenance Completion**: Record completed maintenance with costs
- **History Tracking**: Full audit trail of all maintenance records

### Business Logic Rules
1. **Vehicle State Blocking**: Cannot assign vehicle if state is `in_maintenance` or `maintenance_overdue`
2. **Automatic State Updates**: Vehicle state automatically updates when maintenance status changes
3. **Maintenance Alerts**: Triggered when:
   - Remaining km <= 500 or remaining days <= 7 (APPROACHING)
   - Scheduled odometer/date exceeded (OVERDUE)

## API Endpoints

### Vehicles
- `POST /vehicles` - Create vehicle
- `GET /vehicles` - List all vehicles
- `GET /vehicles/:id` - Get vehicle details
- `PUT /vehicles/:id` - Update vehicle
- `DELETE /vehicles/:id` - Delete vehicle
- `POST /vehicles/:id/odometer` - Update odometer (trip completion)
- `GET /vehicles/:id/can-assign` - Check if vehicle can be assigned
- `GET /vehicles/:id/maintenance-alerts` - Get maintenance alerts

### Maintenance
- `POST /maintenance` - Create maintenance record
- `GET /maintenance` - List all maintenance records
- `GET /maintenance/:id` - Get maintenance details
- `GET /maintenance/vehicle/:vehicleId` - Get vehicle's maintenance
- `PUT /maintenance/:id` - Update maintenance record
- `DELETE /maintenance/:id` - Delete maintenance record
- `POST /maintenance/:id/complete` - Mark maintenance as completed
- `GET /maintenance/vehicle/:vehicleId/pending` - Get pending maintenance
- `GET /maintenance/vehicle/:vehicleId/completed` - Get completed maintenance

## Test Coverage

- **VehiclesService**: 16 tests covering:
  - Vehicle creation with default states
  - CRUD operations
  - Odometer updates with distance validation
  - Trip assignment validation
  - Maintenance alert detection (approaching & overdue by km/date)
  - Vehicle state management

- **MaintenanceService**: 7 tests covering:
  - Maintenance record creation and validation
  - Record completion with cost tracking
  - Pending/completed maintenance filtering
  - Vehicle state updates based on maintenance status
  - Maintenance history management

- **Overall Coverage**: 78.57% statements, 63.63% branches

## Usage Example

```typescript
// Create a vehicle
const vehicle = await vehiclesService.create({
  plate: 'ABC-123',
  type: 'truck',
  capacity: 5000,
});

// Schedule maintenance
const maintenance = await maintenanceService.create({
  vehicleId: vehicle.id,
  type: 'oil_change',
  scheduledOdometer: 101000,
  description: 'Regular oil change',
});

// Check if vehicle can be assigned for a trip
const canAssign = await vehiclesService.canAssignForTrip(vehicle.id);

// Update odometer after trip
await vehiclesService.updateOdometer(vehicle.id, 500); // 500 km traveled

// Check maintenance alerts
const alerts = await vehiclesService.checkMaintenanceAlerts(vehicle.id);

// Complete maintenance
await maintenanceService.completeMaintenance(maintenance.id, 500); // $500 cost
```

## Design Principles

- **Clean Architecture**: Clear separation of concerns between DTOs, services, and controllers
- **Validation**: Input validation using class-validator decorators
- **Error Handling**: Meaningful error messages with NestJS exceptions
- **Testability**: Service-layer logic is easily testable with mocked dependencies
- **Scalability**: Module structure allows easy addition of new features
- **JWT Protection**: All endpoints protected with JWT authentication
