# Flujo Completo: Conductores ↔ Viajes ↔ Combustible

## Vista General del Proyecto

```mermaid
flowchart LR
        U[Usuario / Operador] --> A[API NestJS]
        A --> B[Auth + Roles]
        A --> C[Trips]
        A --> D[Drivers]
        A --> E[Vehicles]
        A --> F[Fuel Records]
        A --> G[Maintenance]
        A --> H[Audit]

        C --> I[Prisma ORM]
        D --> I
        E --> I
        F --> I
        G --> I
        H --> I

        I --> J[(PostgreSQL / Prisma Schema)]

        C --> K[Validaciones de negocio]
        E --> K
        F --> K

        K --> L[Evita duplicidades]
        K --> M[Controla disponibilidad]
        K --> N[Calcula rendimiento]
```

## Flujo Operativo del Negocio

```mermaid
flowchart TD
        A[Registrar conductor y vehículo] --> B[Crear viaje]
        B --> C{Conductor activo y vehículo disponible?}
        C -->|No| D[Rechazar operación]
        C -->|Sí| E[Iniciar viaje]
        E --> F[Registrar consumos de combustible]
        F --> G[Actualizar odómetro y estado]
        G --> H[Completar viaje]
        H --> I[Calcular rendimiento]
        I --> J[Generar trazabilidad y auditoría]
```

## Diferenciador del Sistema

```mermaid
mindmap
    root((Proyecto))
        Control operativo
            Viajes únicos
            Vehículos disponibles
            Conductores activos
        Eficiencia
            Consumo de combustible
            Rendimiento km/galón
            Reducción de errores
        Trazabilidad
            Auditoría
            Historial por viaje
            Estado de flota
        Enfoque de negocio
            Una sucursal
            MVP claro
            Escalable por etapas
```

## Diagrama Entidad-Relación (Mermaid)

```mermaid
erDiagram
    DRIVER ||--o{ TRIP : "realiza (1:N)"
    VEHICLE ||--o{ TRIP : "usa (1:N)"
    VEHICLE ||--o{ FUEL_RECORD : "registra (1:N)"
    TRIP ||--o{ FUEL_RECORD : "tiene (1:N)"
    VEHICLE ||--o{ MAINTENANCE : "programa (1:N)"
    VEHICLE ||--o{ AUDIT_LOG : "audita (1:N)"
    USER ||--o{ AUDIT_LOG : "ejecuta (1:N)"
    ROLE ||--o{ USER : "tiene (1:N)"

    DRIVER {
        int id PK
        string name
        string licenseNumber UK "Único"
        string licenseType "A1, A2, B1, B2, C1, C2, C3"
        datetime licenseExpiry "Vencimiento licencia"
        string phone
        string email UK
        string address
        datetime hireDate
        boolean isActive "Debe ser true para viajes"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt "Soft delete"
    }

    VEHICLE {
        int id PK
        string plate UK "Placa única"
        string type "camión, van, camioneta, etc."
        float capacity "Capacidad carga (kg)"
        float currentOdometer "Odómetro actual"
        string state "available, in_use, maintenance, inactive"
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
        float distance "km planificados"
        float cargoWeight "kg"
        float startOdometer "Odómetro al iniciar"
        float endOdometer "Odómetro al finalizar"
        datetime startDate
        datetime endDate
        string status "planned, in_progress, completed, cancelled"
        datetime createdAt
        datetime updatedAt
        datetime deletedAt
    }

    FUEL_RECORD {
        int id PK
        int tripId FK
        int vehicleId FK
        float liters "Litros cargados"
        float cost "Costo total"
        float pricePerLiter "Precio por litro"
        float odometer "Odómetro al cargar"
        datetime date "Fecha carga"
        string station "Estación (opcional)"
        datetime createdAt
        datetime updatedAt
    }
```

---

## Máquina de Estados del Viaje

```mermaid
stateDiagram-v2
    [*] --> PLANNED : POST /trips
    PLANNED --> IN_PROGRESS : PATCH /trips/:id/start
    IN_PROGRESS --> COMPLETED : PATCH /trips/:id/complete
    PLANNED --> CANCELLED : PATCH /trips/:id/cancel
    IN_PROGRESS --> CANCELLED : PATCH /trips/:id/cancel
    COMPLETED --> [*] : Fin
    CANCELLED --> [*] : Fin

    note right of PLANNED
        ✅ Validaciones al crear:
        - Driver.exists && Driver.isActive
        - Vehicle.exists && Vehicle.state == 'available'
        - Driver NO tiene trip en [planned, in_progress]
        - Vehicle NO tiene trip en [planned, in_progress]
        - License no vencida (validado en DriverService)
    end note

    note right of IN_PROGRESS
        🔄 Vehicle.state = 'in_use'
        📍 startOdometer = Vehicle.currentOdometer (o DTO)
        ⏱️ startDate = now()
    end note

    note right of COMPLETED
        🔒 TRANSACCIÓN ATÓMICA (prisma.$transaction):
        1. Trip: status=completed, endOdometer, endDate
        2. Vehicle: state=available, currentOdometer=endOdometer
        3. Performance: FuelRecordsService.calculateTripPerformance(tripId)
        📊 Retorna TripResponseDto + performance (km/L, km/gal, $/L)
    end note

    note right of CANCELLED
        🔄 Vehicle.state = 'available' (si estaba in_use)
        📝 Soft delete opcional
    end note
```

---

## Flujo: Crear Viaje (POST /trips)

```mermaid
flowchart TD
    A[POST /trips<br/>CreateTripDto] --> B{Validar DTO<br/>class-validator}
    B -->|❌ Inválido| C[400 Bad Request<br/>ValidationError[]]
    B -->|✅ Válido| D[Buscar Driver por ID]
    D --> E{Driver existe?}
    E -->|❌| F[404 Not Found]
    E -->|✅| G{Driver.isActive == true?}
    G -->|❌| H[400 Driver inactivo]
    G -->|✅| I[Buscar Vehicle por ID]
    I --> J{Vehicle existe?}
    J -->|❌| K[404 Not Found]
    J -->|✅| L{Vehicle.state == 'available'?}
    L -->|❌| M[400 Vehicle no disponible<br/>estado: maintenance/in_use/inactive]
    L -->|✅| N[Verificar Driver sin viaje activo]
    N --> O{Driver libre?}
    O -->|❌| P[400 Driver tiene viaje activo<br/>IDs: planned/in_progress]
    O -->|✅| Q[Verificar Vehicle sin viaje activo]
    Q --> R{Vehicle libre?}
    R -->|❌| S[400 Vehicle tiene viaje activo]
    R -->|✅| T[Crear Trip<br/>status=planned<br/>startOdometer=Vehicle.currentOdometer]
    T --> U[Actualizar Vehicle<br/>state='in_use']
    U --> V[Auditar: CREATE TRIP]
    V --> W[Retornar TripResponseDto]
```

---

## Flujo: Completar Viaje (PATCH /trips/:id/complete)

```mermaid
flowchart TD
    A[PATCH /trips/:id/complete<br/>endOdometer, endDate?] --> B{Validar endOdometer >= startOdometer}
    B -->|❌| C[400 Odómetro final < inicial]
    B -->|✅| D[Trip existe y no deletedAt?]
    D -->|❌| E[404 Not Found]
    D -->|✅| F{Trip.status en [planned, in_progress]?}
    F -->|❌| G[400 Ya completed/cancelled]
    F -->|✅| H[INICIAR TRANSACCIÓN<br/>prisma.$transaction]
    H --> I[1. Actualizar Trip<br/>status=completed<br/>endOdometer, endDate]
    I --> J[2. Actualizar Vehicle<br/>state=available<br/>currentOdometer=endOdometer]
    J --> K[3. Calcular Performance<br/>FuelRecordsService.calculateTripPerformance(tripId)]
    K --> L{Hay FuelRecords?}
    L -->|Sí| M[Calcular: totalLiters, totalCost,<br/>distanceKm, kmPerLiter,<br/>kmPerGallon, avgPricePerLiter]
    L -->|No| N[performance = undefined]
    M --> O[COMMIT TRANSACCIÓN]
    N --> O
    O --> P[Auditar: COMPLETE TRIP]
    P --> Q[Retornar TripResponseDto<br/>+ performance?]
```

---

## Flujo: Registro de Combustible (POST /fuel-records)

```mermaid
flowchart TD
    A[POST /fuel-records<br/>CreateFuelRecordDto] --> B{Validar DTO}
    B -->|❌| C[400 ValidationError]
    B -->|✅| D[Trip existe?]
    D -->|❌| E[404 Trip not found]
    D -->|✅| F[Vehicle existe?]
    F -->|❌| G[404 Vehicle not found]
    F -->|✅| H[Trip.vehicleId == FuelRecord.vehicleId?]
    H -->|❌| I[400 Vehicle no coincide con Trip]
    H -->|✅| J[Crear FuelRecord<br/>pricePerLiter = cost/liters]
    J --> K[Auditar: CREATE FUEL_RECORD]
    K --> L[Retornar FuelRecordResponseDto]
```

---

## Cálculo de Rendimiento (FuelRecordsService)

```mermaid
flowchart TD
    A[calculateTripPerformance(tripId)] --> B[Buscar FuelRecords<br/>where: tripId]
    B --> C{Registros encontrados?}
    C -->|No| D[Lanzar NotFoundException<br/>'No fuel records for trip']
    C -->|Sí| E[Agregar: totalLiters = SUM(liters)]
    E --> F[Agregar: totalCost = SUM(cost)]
    F --> G[Obtener Trip.distance = distanceKm]
    G --> H[kmPerLiter = distanceKm / totalLiters]
    H --> I[kmPerGallon = kmPerLiter * 3.78541]
    I --> J[avgPricePerLiter = totalCost / totalLiters]
    J --> K[Retornar TripPerformanceDto]
```

---

## Reglas de Negocio Resumidas

| Regla | Implementación | Ubicación |
|-------|----------------|-----------|
| **Conductor único por viaje activo** | `findFirst driverId + status IN [planned, in_progress]` | `TripsService.create()` |
| **Vehículo único por viaje activo** | `findFirst vehicleId + status IN [planned, in_progress]` | `TripsService.create()` |
| **Vehículo debe estar disponible** | `vehicle.state === 'available'` | `TripsService.create()` |
| **Conductor debe estar activo** | `driver.isActive === true` | `TripsService.create()` |
| **Licencia no vencida** | Validación en `DriverService.activate()` | `DriversService` |
| **Odómetro final ≥ inicial** | `endOdometer >= trip.startOdometer` | `TripsService.completeTrip()` |
| **Transacción atómica al completar** | `prisma.$transaction([...])` | `TripsService.completeTrip()` |
| **Actualizar odómetro vehículo** | `vehicle.currentOdometer = endOdometer` | `TripsService.completeTrip()` |
| **Liberar vehículo al completar** | `vehicle.state = 'available'` | `TripsService.completeTrip()` |
| **Rendimiento km/galón** | `kmPerLiter * 3.78541` | `FuelRecordsService` |
| **Soft delete en todas las entidades** | `deletedAt DateTime?` + `where: { deletedAt: null }` | Prisma schema + Services |
| **Auditoría automática** | `AuditService.log(action, entity, id, data)` | Todos los Services |

---

## Endpoints Principales

### Conductores
```
POST   /drivers              # Crear
GET    /drivers              # Listar (query: includeInactive)
GET    /drivers/:id          # Obtener por ID
GET    /drivers/license/:num # Obtener por licencia
PATCH  /drivers/:id          # Actualizar
DELETE /drivers/:id          # Soft delete
PATCH  /drivers/:id/activate # Activar (valida licencia)
```

### Viajes
```
POST   /trips                    # Crear (valida driver + vehicle)
GET    /trips                    # Listar
GET    /trips/:id                # Obtener
PATCH  /trips/:id                # Actualizar (solo planned)
PATCH  /trips/:id/start          # Iniciar → in_progress
PATCH  /trips/:id/complete       # Completar → completed + transacción
PATCH  /trips/:id/cancel         # Cancelar → cancelled
DELETE /trips/:id                # Soft delete
```

### Combustible
```
POST   /fuel-records           # Registrar carga
GET    /fuel-records           # Listar (filtros: tripId, vehicleId, dateFrom, dateTo)
GET    /fuel-records/:id       # Obtener
GET    /fuel-records/trip/:tripId/performance  # Calcular rendimiento
PATCH  /fuel-records/:id       # Actualizar
DELETE /fuel-records/:id       # Soft delete
```

---

## Ejemplo de Respuesta: Completar Viaje con Rendimiento

```json
{
  "id": 1,
  "driverId": 1,
  "vehicleId": 1,
  "origin": "Bogotá",
  "destination": "Medellín",
  "distance": 415,
  "cargoWeight": 5000,
  "startOdometer": 125000,
  "endOdometer": 125415,
  "startDate": "2026-07-10T08:00:00.000Z",
  "endDate": "2026-07-10T14:30:00.000Z",
  "status": "completed",
  "driver": { "id": 1, "name": "Juan Pérez", "licenseNumber": "LIC123456" },
  "vehicle": { "id": 1, "plate": "ABC123", "type": "camión" },
  "performance": {
    "totalLiters": 50,
    "totalCost": 150000,
    "distanceKm": 415,
    "kmPerLiter": 8.3,
    "kmPerGallon": 31.4,
    "averagePricePerLiter": 3000
  },
  "createdAt": "2026-07-10T08:00:00.000Z",
  "updatedAt": "2026-07-10T14:30:00.000Z"
}
```