import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Vehicles Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let vehiclePlate: string;
  let maintenancePlate: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await prismaService.fuelRecord.deleteMany();
    await prismaService.trip.deleteMany();
    await prismaService.maintenance.deleteMany();
    await prismaService.vehicle.deleteMany();

    const uniqueSuffix = `${Date.now()}`;
    vehiclePlate = `TEST-${uniqueSuffix}`;
    maintenancePlate = `MAINT-${uniqueSuffix}`;

    // Get auth token
    const authResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@fleet.local',
        password: 'Password123!',
      });

    authToken = authResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Vehicle Lifecycle', () => {
    let vehicleId: number;

    it('should create a vehicle', async () => {
      const response = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plate: vehiclePlate,
          type: 'truck',
          capacity: 5000,
          currentOdometer: 50000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.plate).toBe(vehiclePlate);
      expect(response.body.state).toBe('available');
      vehicleId = response.body.id;
    });

    it('should retrieve the created vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.plate).toBe(vehiclePlate);
      expect(response.body.maintenanceSchedule).toEqual([]);
    });

    it('should update vehicle', async () => {
      const response = await request(app.getHttpServer())
        .put(`/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          capacity: 6000,
        })
        .expect(200);

      expect(response.body.capacity).toBe(6000);
    });

    it('should update odometer after trip', async () => {
      const response = await request(app.getHttpServer())
        .post(`/vehicles/${vehicleId}/odometer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ distance: 500 })
        .expect(201);

      expect(response.body.currentOdometer).toBe(50500);
    });

    it('should not allow assignment when in maintenance', async () => {
      // Set vehicle to in_maintenance state
      await prismaService.vehicle.update({
        where: { id: vehicleId },
        data: { state: 'in_maintenance' },
      });

      const response = await request(app.getHttpServer())
        .get(`/vehicles/${vehicleId}/can-assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toBe('false');
    });
  });

  describe('Maintenance Workflow', () => {
    let vehicleId: number;
    let maintenanceId: number;

    beforeAll(async () => {
      const vehicleResponse = await request(app.getHttpServer())
        .post('/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plate: maintenancePlate,
          type: 'van',
          capacity: 2000,
          currentOdometer: 40000,
        });

      vehicleId = vehicleResponse.body.id;
    });

    it('should schedule preventive maintenance', async () => {
      const response = await request(app.getHttpServer())
        .post('/maintenance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId,
          type: 'oil_change',
          scheduledOdometer: 42000,
          description: 'Regular oil change',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('oil_change');
      expect(response.body.isCompleted).toBe(false);
      maintenanceId = response.body.id;
    });

    it('should get maintenance alerts when approaching', async () => {
      // Update odometer to get close to scheduled maintenance
      await request(app.getHttpServer())
        .post(`/vehicles/${vehicleId}/odometer`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ distance: 1500 });

      const response = await request(app.getHttpServer())
        .get(`/vehicles/${vehicleId}/maintenance-alerts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].type).toBe('APPROACHING');
    });

    it('should complete maintenance with cost', async () => {
      const response = await request(app.getHttpServer())
        .post(`/maintenance/${maintenanceId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cost: 450 })
        .expect(201);

      expect(response.body.isCompleted).toBe(true);
      expect(response.body.cost).toBe(450);
      expect(response.body.completedDate).toBeDefined();
    });

    it('should get vehicle cost analysis', async () => {
      const response = await request(app.getHttpServer())
        .get(`/vehicles/${vehicleId}/cost-analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.vehicleId).toBe(vehicleId);
      expect(response.body.totalMaintenanceCost).toBe(450);
      expect(response.body.totalKmTraveled).toBe(41400);
      expect(response.body.averageCostPerKm).toBeGreaterThan(0);
      expect(response.body.maintenanceCount).toBe(1);
    });
  });

  describe('Fleet Reports', () => {
    it('should get fleet efficiency report', async () => {
      const response = await request(app.getHttpServer())
        .get('/fleet-reports/efficiency')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalVehicles');
      expect(response.body).toHaveProperty('ranking');
      expect(response.body).toHaveProperty('vehiclesNeedingAttention');
      expect(response.body).toHaveProperty('recommendations');
    });
  });
});
