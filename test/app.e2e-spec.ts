import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Fleet Management API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let driverToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/flota_apis_test?schema=public';
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

    const prismaPushCommand =
      process.platform === 'win32'
        ? 'npx.cmd prisma db push --force-reset --skip-generate'
        : 'npx prisma db push --force-reset --skip-generate';

    execSync(prismaPushCommand, {
      env: process.env,
      stdio: 'inherit',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    prisma = app.get(PrismaService);
    await app.init();

    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    const adminRole = await prisma.role.create({ data: { name: 'admin' } });
    const operatorRole = await prisma.role.create({ data: { name: 'operador' } });
    const driverRole = await prisma.role.create({ data: { name: 'conductor' } });
    const password = await bcrypt.hash('Password123!', 10);

    await prisma.user.create({
      data: {
        name: 'Admin Test',
        email: 'admin@test.local',
        password,
        roleId: adminRole.id,
      },
    });

    await prisma.user.create({
      data: {
        name: 'Operador Test',
        email: 'operador@test.local',
        password,
        roleId: operatorRole.id,
      },
    });

    await prisma.user.create({
      data: {
        name: 'Conductor Test',
        email: 'conductor@test.local',
        password,
        roleId: driverRole.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await app.close();
  });

  it('POST /auth/login returns tokens for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.local', password: 'Password123!' })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.email).toBe('admin@test.local');
    expect(response.body.user.password).toBeUndefined();

    adminToken = response.body.accessToken;
  });

  it('POST /auth/login rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.local', password: 'wrong-password' })
      .expect(401);
  });

  it('GET /users rejects requests without token', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('GET /users rejects users with wrong role', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'conductor@test.local', password: 'Password123!' })
      .expect(201);

    driverToken = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${driverToken}`)
      .expect(403);
  });

  it('GET /users returns users for admin role', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body).toHaveLength(3);
    expect(response.body[0].password).toBeUndefined();
  });
});
