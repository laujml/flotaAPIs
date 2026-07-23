import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const roles = ['admin', 'operador', 'conductor'] as const;

async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.fuelRecord.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.role.deleteMany();
}

async function main() {
  console.log('⏳ Limpiando base de datos...');
  await clearDatabase();

  // 1. CREAR ROLES (3)
  console.log('👥 Creando roles...');
  const roleRecords = new Map<string, { id: number }>();
  for (const name of roles) {
    const role = await prisma.role.create({ data: { name } });
    roleRecords.set(name, role);
  }

  const password = await bcrypt.hash('Password123!', 10);

  // 2. CREAR USUARIOS (3 principales)
  const adminUser = await prisma.user.create({
    data: { name: 'Admin General', email: 'admin@fleet.local', password, roleId: roleRecords.get('admin')!.id, isActive: true },
  });
  const operatorUser = await prisma.user.create({
    data: { name: 'Operador Central', email: 'operador@fleet.local', password, roleId: roleRecords.get('operador')!.id, isActive: true },
  });
  await prisma.user.create({
    data: { name: 'Conductor Base', email: 'conductor@fleet.local', password, roleId: roleRecords.get('conductor')!.id, isActive: true },
  });

  // 3. CREAR VEHÍCULOS (20)
  console.log('🚚 Creando 20 vehículos...');
  const vehicleTypes = ['truck', 'van', 'pickup'] as const;
  const vehicleStates = ['available', 'in_trip', 'in_maintenance', 'maintenance_overdue'] as const;
  const createdVehicles: any[] = [];

  for (let i = 1; i <= 20; i++) {
    const type = vehicleTypes[i % vehicleTypes.length];
    const state = i <= 3 ? vehicleStates[i % vehicleStates.length] : 'available'; // Repartir estados en los primeros, dejar el resto disponibles
    
    const vehicle = await prisma.vehicle.create({
      data: {
        plate: `${type === 'truck' ? 'TRK' : type === 'van' ? 'VAN' : 'PCK'}-${100 + i}`,
        type,
        capacity: type === 'truck' ? 6000 : type === 'van' ? 2500 : 1200,
        currentOdometer: 50000 + i * 4500,
        state,
      },
    });
    createdVehicles.push(vehicle);
  }

  // 4. CREAR CONDUCTORES (10)
  console.log('🧑‍✈️ Creando 10 conductores...');
  const licenseTypes = ['C1', 'C2', 'B1', 'B2'];
  const createdDrivers: any[] = [];
  const firstNames = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Diana', 'Andrés', 'Patricia', 'Pedro', 'Laura'];
  const lastNames = ['Gómez', 'Rodríguez', 'Pérez', 'Martínez', 'López', 'García', 'Sánchez', 'Ramírez', 'Torres', 'Flores'];

  for (let i = 0; i < 10; i++) {
    const driver = await prisma.driver.create({
      data: {
        name: `${firstNames[i]} ${lastNames[i]}`,
        licenseNumber: `LIC-${2000 + i}`,
        licenseType: licenseTypes[i % licenseTypes.length],
        licenseExpiry: new Date(Date.now() + (i % 2 === 0 ? 365 : -30) * DAY_MS), // Algunos vigentes, otros vencidos
        phone: `+57 310 ${1000000 + i * 11111}`,
        email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@fleet.local`,
        address: `Sucursal ${i % 2 === 0 ? 'Norte' : 'Sur'}`,
        hireDate: new Date(Date.now() - 365 * DAY_MS),
        isActive: i < 9, // 9 activos, 1 inactivo
      },
    });
    createdDrivers.push(driver);
  }

  // 5. CREAR TRIPS (20)
  console.log('📍 Creando 20 viajes...');
  const tripStatuses = ['completed', 'in_progress', 'planned', 'cancelled'] as const;
  const cities = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Cartagena', 'Pereira', 'Manizales'];
  const createdTrips: any[] = [];

  for (let i = 0; i < 20; i++) {
    const vehicle = createdVehicles[i % createdVehicles.length];
    const driver = createdDrivers[i % createdDrivers.length];
    
    // Forzar consistencia de estados: Si el vehículo está 'in_trip', el viaje debe estar 'in_progress'
    let status: typeof tripStatuses[number] = tripStatuses[i % tripStatuses.length];
    if (vehicle.state === 'in_trip' && createdTrips.filter(t => t.status === 'in_progress').length === 0) {
      status = 'in_progress';
    } else if (status === 'in_progress') {
      status = 'completed'; // Solo dejamos un par en progreso para no romper la lógica de flota
    }

    const startOdo = vehicle.currentOdometer - 1500;
    const distance = 150 + i * 35;
    const isCompleted = status === 'completed';

    const trip = await prisma.trip.create({
      data: {
        driverId: driver.id,
        vehicleId: vehicle.id,
        origin: cities[i % cities.length],
        destination: cities[(i + 1) % cities.length],
        distance,
        cargoWeight: Math.floor(vehicle.capacity * 0.8),
        startOdometer: startOdo,
        endOdometer: isCompleted ? startOdo + distance : null,
        startDate: new Date(Date.now() - (20 - i) * DAY_MS),
        endDate: isCompleted ? new Date(Date.now() - (20 - i - 1) * DAY_MS) : null,
        status,
      },
    });
    createdTrips.push(trip);
  }

  // 6. CREAR FUEL RECORDS (20)
  console.log('⛽ Creando 20 registros de combustible...');
  const fuelStations = ['Terpel', 'Primax', 'Petrobras', 'Texaco'];
  
  for (let i = 0; i < 20; i++) {
    // Tomamos viajes completados o en progreso para asociarles combustible
    const trip = createdTrips[i % createdTrips.length];
    const liters = 20 + (i * 3);
    const pricePerLiter = 3700 + (i * 15);

    await prisma.fuelRecord.create({
      data: {
        tripId: trip.id,
        vehicleId: trip.vehicleId,
        liters,
        pricePerLiter,
        cost: liters * pricePerLiter,
        odometer: trip.startOdometer + Math.floor(trip.distance * 0.5),
        date: new Date(trip.startDate.getTime() + 4 * 60 * 60 * 1000), // 4 horas después de iniciar
        station: `${fuelStations[i % fuelStations.length]} - Ruta ${i + 1}`,
      },
    });
  }

  // 7. CREAR MAINTENANCES (10)
  console.log('🔧 Creando 10 registros de mantenimiento...');
  const maintenanceTypes = ['oil_change', 'tire_rotation', 'brake_inspection', 'transmission_service', 'general_revision'] as const;
  
  for (let i = 0; i < 10; i++) {
    const vehicle = createdVehicles[i * 2]; // Usar vehículos intercalados
    const isCompleted = i % 2 === 0;

    await prisma.maintenance.create({
      data: {
        vehicleId: vehicle.id,
        type: maintenanceTypes[i % maintenanceTypes.length],
        scheduledOdometer: vehicle.currentOdometer + 5000,
        scheduledDate: isCompleted ? null : new Date(Date.now() + (i + 1) * DAY_MS),
        completedDate: isCompleted ? new Date(Date.now() - (i + 1) * DAY_MS) : null,
        cost: 150 + (i * 120),
        description: `Mantenimiento preventivo tipo ${i + 1}`,
        isCompleted,
      },
    });
  }

  // 8. CREAR AUDIT LOGS (Cualquier cantidad basada en eventos anteriores)
  console.log('📝 Creando registros de auditoría...');
  await prisma.auditLog.createMany({
    data: [
      {
        vehicleId: createdVehicles[0].id,
        action: 'CREATE',
        entityType: 'Vehicle',
        entityId: createdVehicles[0].id,
        changedFields: JSON.stringify(['plate', 'type']),
        oldValues: null,
        newValues: JSON.stringify({ plate: createdVehicles[0].plate, type: createdVehicles[0].type }),
        userId: adminUser.id,
        userEmail: adminUser.email,
        ipAddress: '192.168.1.50',
      },
      {
        vehicleId: createdVehicles[1].id,
        action: 'UPDATE',
        entityType: 'Trip',
        entityId: createdTrips[0].id,
        changedFields: JSON.stringify(['status']),
        oldValues: JSON.stringify({ status: 'in_progress' }),
        newValues: JSON.stringify({ status: 'completed' }),
        userId: operatorUser.id,
        userEmail: operatorUser.email,
        ipAddress: '192.168.1.62',
      },
      {
        vehicleId: createdVehicles[2].id,
        action: 'UPDATE',
        entityType: 'Vehicle',
        entityId: createdVehicles[2].id,
        changedFields: JSON.stringify(['state']),
        oldValues: JSON.stringify({ state: 'available' }),
        newValues: JSON.stringify({ state: 'in_maintenance' }),
        userId: adminUser.id,
        userEmail: adminUser.email,
        ipAddress: '127.0.0.1',
      }
    ],
  });

  console.log('\n🚀 ¡Seeder ejecutado con éxito!');
  console.log(`- Roles: 3`);
  console.log(`- Usuarios maestros: 3`);
  console.log(`- Vehículos: ${createdVehicles.length}`);
  console.log(`- Conductores: ${createdDrivers.length}`);
  console.log(`- Viajes (Trips): ${createdTrips.length}`);
  console.log(`- Registros de Gasolina: 20`);
  console.log(`- Mantenimientos: 10`);
  console.log(`- Registros de Auditoría: 3`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Error en el seeder:', error);
    await prisma.$disconnect();
    process.exit(1);
  });