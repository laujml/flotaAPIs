# Flujo de Modelos: Conductores, Viajes y Combustible

## Diagrama de Relaciones (Mermaid)

```mermaid
erDiagram
    DRIVER ||--o{ TRIP : "realiza"
    VEHICLE ||--o{ TRIP : "usa"
    VEHICLE ||--o{ FUEL_RECORD : "registra"
    TRIP ||--o{ FUEL_RECORD : "tiene"
    VEHICLE ||--o{ MAINTENANCE : "programa"
    VEHICLE ||--o{ AUDIT_LOG : "audita"
    USER ||--o{ AUDIT_LOG : "ejecuta"
    ROLE ||--o{ USER : "tiene"

    DRIVER {
        int id PK
        string name
        string licenseNumber UK
        string licenseType
        datetime licenseExpiry
        string phone
        string email UK
        string address
        datetime hireDate
        boolean isActive
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    VEHICLE {
        int id PK
        string plate UK
        string type
        float capacity
        float currentOdometer
        string state
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    TRIP {
        int id PK
        int driverId FK
        int vehicleId FK
        string origin
        string destination
        float distance
        float cargoWeight
        float startOdometer
        float endOdometer
        datetime startDate
        datetime endDate
        string status
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    FUEL_RECORD {
        int id PK
        int tripId FK
        int vehicleId FK
        float liters
        float cost
        float pricePerLiter
        float odometer
        datetime date
        string station
        datetime createdAt
        datetime updatedAt
    }

    MAINTENANCE {
        int id PK
        int vehicleId FK
        string type
        float scheduledOdometer
        datetime scheduledDate
        datetime completedDate
        float cost
        string description
        boolean isCompleted
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    AUDIT_LOG {
        int id PK
        int vehicleId FK
        string action
        string entityType
        int entityId
        string changedFields
        string oldValues
        string newValues
        int userId
        string userEmail
        string ipAddress
        datetime createdAt
    }

    USER {
        int id PK
        string name
        string email UK
        string password
        int roleId FK
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    ROLE {
        int id PK
        string name UK
    }
```

## Flujo de Estados del Viaje (State Machine)

```mermaid
stateDiagram-v2
    [*] --> PLANNED : Crear viaje
    PLANNED --> IN_PROGRESS : Iniciar viaje (startTrip)
    IN_PROGRESS --> COMPLETED : Completar viaje (completeTrip)
    PLANNED --> CANCELLED : Cancelar viaje
    IN_PROGRESS --> CANCELLED : Cancelar viaje
    COMPLETED --> [*] : Fin
    CANCELLED --> [*] : Fin

    note right of PLANNED
        Validaciones:
        - Conductor activo
        - Vehículo disponible
        - Conductor sin viaje activo
        - Vehículo sin viaje activo
    end note

    note right of IN_PROGRESS
        Vehículo en estado 'in_use'
        Odómetro inicial registrado
    end note

    note right of COMPLETED
        Transacción atómica:
        1. Actualizar viaje (status, endOdometer, endDate)
        2. Actualizar vehículo (state=available, currentOdometer)
        3. Calcular rendimiento (FuelRecordsService)
    end note
```

## Flujo de Creación de Viaje

```mermaid
flowchart TD
    A[POST /trips] --> B{Validar DTO}
    B -->|Inválido| C[400 Bad Request]
    B -->|Válido| D[Buscar Conductor]
    D --> E{Conductor existe y activo?}
    E -->|No| F[404/400 Error]
    E -->|Sí| G[Buscar Vehículo]
    G --> H{Vehículo existe y disponible?}
    H --> I[state=available]?}
    H -->|No| I[404/400 Error]
    H -->|Sí| J[Verificar conductor sin viaje activo]
    J --> K{Conductor libre?}
    K -->|No| L[400 Conductor tiene viaje activo]
    K -->|Sí| M[Verificar vehículo sin viaje activo]
    M --> N{Vehículo libre?}
    N -->|No| O[400 Vehículo tiene viaje activo]
    N -->|Sí| P[Crear Trip status=planned]
    P --> Q[Actualizar Vehicle state=in_use]
    Q --> R[Retornar TripResponseDto]
```

## Flujo de Completar Viaje (con Transacción)

```mermaid
flowchart TD
    A[PATCH /trips/:id/complete] --> B{Validar endOdometer >= startOdometer}
    B -->|No| C[400 Bad Request]
    B -->|Sí| D[Iniciar Prisma Transaction]
    D --> E[Buscar Trip con driver y vehicle]
    E --> F{Trip existe y no completado/cancelado?}
    F -->|No| G[404/400 Error]
    F -->|Sí| H[Actualizar Trip: status=completed, endOdometer, endDate]
    H --> I[Actualizar Vehicle: state=available, currentOdometer=endOdometer]
    I --> J[Llamar FuelRecordsService.calculateTripPerformance(tripId)]
    J --> K{Existen FuelRecords?}
    K -->|Sí| L[Calcular: totalLiters, totalCost, distanceKm, kmPerLiter, kmPerGallon, avgPricePerLiter]
    K -->|No| M[performance = undefined]
    L --> N[Commit Transaction]
    M --> N
    N --> O[Retornar TripResponseDto con performance]
```

## Flujo de Registro de Combustible

```mermaid
flowchart TD
    A[POST /fuel-records] --> B{Validar DTO}
    B -->|Inválido| C[400 Bad Request]
    B -->|Válido| D[Verificar Trip existe]
    D --> E{Trip existe?}
    E -->|No| F[404 Not Found]
    E -->|Sí| G[Verificar Vehicle existe]
    G --> H{Vehicle existe?}
    H -->|No| I[404 Not Found]
    H -->|Sí| J[Calcular pricePerLiter = cost / liters]
    J --> K[Crear FuelRecord]
    K --> L[Retornar FuelRecordResponseDto]
```

## Cálculo de Rendimiento (km/galón)

```mermaid
flowchart LR
    A[FuelRecordsService.calculateTripPerformance(tripId)] --> B[Buscar FuelRecords por tripId]
    B --> C{Existen registros?}
    C -->|No| D[Lanzar NotFoundException]
    C -->|Sí| E[Agregar: totalLiters = SUM(liters)]
    E --> F[Agregar: totalCost = SUM(cost)]
    F --> G[Obtener Trip para distance]
    G --> H[distanceKm = trip.distance]
    H --> I[kmPerLiter = distanceKm / totalLiters]
    I --> J[kmPerGallon = kmPerLiter * 3.78541]
    J --> K[avgPricePerLiter = totalCost / totalLiters]
    K --> L[Retornar TripPerformanceDto]
```

## Reglas de Negocio Implementadas

| Regla | Implementación | Ubicación |
|-------|---------------|-----------|
| Conductor no puede tener 2 viajes activos | Validación en `TripsService.create()` | `src/trips/trips.service.ts:45-55` |
| Vehículo no disponible → bloquear viaje | Validación `vehicle.state !== 'available'` | `src/trips/trips.service.ts:57-62` |
| Actualizar odómetro al cerrar viaje | Transacción en `completeTrip()` | `src/trips/trips.service.ts:180-220` |
| Transacción BD al cerrar viaje | `prisma.$transaction([...])` | `src/trips/trips.service.ts:180` |
| Cálculo rendimiento km/galón | `FuelRecordsService.calculateTripPerformance()` | `src/fuel-records/fuel-records.service.ts` |
| Soft delete en todas las entidades | Campo `deletedAt` + filtro `deletedAt: null` | `prisma/schema.prisma` |
| Auditoría de cambios | `AuditService.log()` | `src/common/services/audit.service.ts` |

## Endpoints Principales

### Conductores
- `POST /drivers` - Crear conductor
- `GET /drivers` - Listar conductores
- `GET /drivers/:id` - Obtener conductor
- `PATCH /drivers/:id` - Actualizar conductor
- `DELETE /drivers/:id` - Eliminar (soft delete)
- `PATCH /drivers/:id/activate` - Activar conductor

### Viajes
- `POST /trips` - Crear viaje (valida conductor + vehículo)
- `GET /trips` - Listar viajes
- `GET /trips/:id` - Obtener viaje
- `PATCH /trips/:id` - Actualizar viaje
- `DELETE /trips/:id` - Eliminar (soft delete)
- `PATCH /trips/:id/start` - Iniciar viaje
- `PATCH /trips/:id/complete` - Completar viaje (transacción + rendimiento)
- `PATCH /trips/:id/cancel` - Cancelar viaje

### Combustible
- `POST /fuel-records` - Registrar consumo
- `GET /fuel-records` - Listar registros
- `GET /fuel-records/trip/:tripId` - Registros por viaje
- `GET /fuel-records/vehicle/:vehicleId` - Registros por vehículo
- `GET /fuel-records/performance/:tripId` - Calcular rendimiento
- `PATCH /fuel-records/:id` - Actualizar registro
- `DELETE /fuel-records/:id` - Eliminar registro
```

## Resumen de Integración

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CONDUCTORES   │     │     VIAJES      │     │   COMBUSTIBLE   │
│                 │     │                 │     │                 │
│ - CRUD completo │────▶│ - CRUD completo │◀───│ - CRUD completo │
│ - Licencia única│     │ - Estados:      │     │ - Cálculo km/L  │
│ - Activo/Inactivo│    │   planned       │     │ - Cálculo km/gal│
│ - Auditoría     │     │   in_progress   │     │ - Precio prom.  │
└─────────────────┘     │   completed     │     └────────┬────────┘
                        │   cancelled     │              │
                        │ - Validaciones: │              │
                        │   * Conductor   │              │
                        │     libre       │              │
                        │   * Vehículo    │              │
                        │     disponible  │              │
                        │ - Transacción   │              │
                        │   al completar  │              │
                        └────────┬────────┘              │
                                 │                       │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │    VEHÍCULOS    │──────────────┘
                        │                 │
                        │ - Estado:       │
                        │   available     │
                        │   in_use        │
                        │   maintenance   │
                        │ - Odómetro      │
                        │ - Auditoría     │
                        └─────────────────┘
```