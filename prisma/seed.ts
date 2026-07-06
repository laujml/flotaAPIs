import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roles = ['admin', 'operador', 'conductor'] as const;

async function main() {
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });
  const operatorRole = await prisma.role.findUniqueOrThrow({ where: { name: 'operador' } });
  const driverRole = await prisma.role.findUniqueOrThrow({ where: { name: 'conductor' } });

  const password = await bcrypt.hash('Password123!', 10);

  await prisma.user.upsert({
    where: { email: 'admin@fleet.local' },
    update: { roleId: adminRole.id, isActive: true },
    create: {
      name: 'Administrador',
      email: 'admin@fleet.local',
      password,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'operador@fleet.local' },
    update: { roleId: operatorRole.id, isActive: true },
    create: {
      name: 'Operador',
      email: 'operador@fleet.local',
      password,
      roleId: operatorRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'conductor@fleet.local' },
    update: { roleId: driverRole.id, isActive: true },
    create: {
      name: 'Conductor',
      email: 'conductor@fleet.local',
      password,
      roleId: driverRole.id,
    },
  });

  // Seed vehicles
  const vehicles = [
    { plate: 'ABC-001', type: 'truck', capacity: 5000, currentOdometer: 85000 },
    { plate: 'ABC-002', type: 'truck', capacity: 5000, currentOdometer: 120000 },
    { plate: 'VAN-001', type: 'van', capacity: 2000, currentOdometer: 45000 },
    { plate: 'VAN-002', type: 'van', capacity: 2000, currentOdometer: 32000 },
    { plate: 'PICKUP-001', type: 'pickup', capacity: 1500, currentOdometer: 65000 },
  ];

  for (const vehicleData of vehicles) {
    await prisma.vehicle.upsert({
      where: { plate: vehicleData.plate },
      update: vehicleData,
      create: vehicleData,
    });
  }

  // Seed maintenance records
  const abc001 = await prisma.vehicle.findUnique({ where: { plate: 'ABC-001' } });
  const abc002 = await prisma.vehicle.findUnique({ where: { plate: 'ABC-002' } });
  const van001 = await prisma.vehicle.findUnique({ where: { plate: 'VAN-001' } });

  if (abc001) {
    await prisma.maintenance.upsert({
      where: { id: 1 },
      update: {},
      create: {
        vehicleId: abc001.id,
        type: 'oil_change',
        scheduledOdometer: 90000,
        completedDate: new Date('2024-06-15'),
        cost: 450,
        isCompleted: true,
        description: 'Regular oil change',
      },
    });

    await prisma.maintenance.upsert({
      where: { id: 2 },
      update: {},
      create: {
        vehicleId: abc001.id,
        type: 'tire_rotation',
        scheduledOdometer: 86000,
        cost: 250,
        isCompleted: false,
        description: 'Tire rotation',
      },
    });
  }

  if (abc002) {
    await prisma.maintenance.upsert({
      where: { id: 3 },
      update: {},
      create: {
        vehicleId: abc002.id,
        type: 'oil_change',
        scheduledOdometer: 125000,
        completedDate: new Date('2024-04-20'),
        cost: 450,
        isCompleted: true,
        description: 'Regular oil change',
      },
    });

    await prisma.maintenance.upsert({
      where: { id: 4 },
      update: {},
      create: {
        vehicleId: abc002.id,
        type: 'brake_inspection',
        scheduledOdometer: 119000,
        cost: 800,
        isCompleted: false,
        description: 'Brake system inspection',
      },
    });
  }

  if (van001) {
    await prisma.maintenance.upsert({
      where: { id: 5 },
      update: {},
      create: {
        vehicleId: van001.id,
        type: 'oil_change',
        scheduledOdometer: 48000,
        completedDate: new Date('2024-05-10'),
        cost: 350,
        isCompleted: true,
        description: 'Regular oil change',
      },
    });

    await prisma.maintenance.upsert({
      where: { id: 6 },
      update: {},
      create: {
        vehicleId: van001.id,
        type: 'transmission_service',
        scheduledOdometer: 50000,
        cost: 1200,
        isCompleted: false,
        description: 'Transmission fluid service',
      },
    });
  }

  console.log('✅ Seed data loaded successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

