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

