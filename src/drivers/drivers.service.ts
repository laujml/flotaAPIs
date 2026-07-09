import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { LicenseType } from './dto/create-driver.dto';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(data: CreateDriverDto) {
    // Check if license number already exists
    const existingDriver = await this.prisma.driver.findUnique({
      where: { licenseNumber: data.licenseNumber },
    });

    if (existingDriver) {
      throw new ConflictException(`Driver with license number ${data.licenseNumber} already exists`);
    }

    // Check if email already exists (if provided)
    if (data.email) {
      const existingEmail = await this.prisma.driver.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new ConflictException(`Driver with email ${data.email} already exists`);
      }
    }

    const driver = await this.prisma.driver.create({
      data: {
        ...data,
        licenseExpiry: new Date(data.licenseExpiry),
        isActive: true,
      },
    });

    await this.auditService.log('CREATE', 'DRIVER', driver.id, {
      newValues: driver,
    });

    return driver;
  }

  async findAll(includeInactive = false) {
    return this.prisma.driver.findMany({
      where: includeInactive ? {} : { isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!driver || driver.deletedAt) {
      throw new NotFoundException(`Driver with ID ${id} not found`);
    }

    return driver;
  }

  async findByLicenseNumber(licenseNumber: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { licenseNumber },
    });

    if (!driver || driver.deletedAt) {
      throw new NotFoundException(`Driver with license ${licenseNumber} not found`);
    }

    return driver;
  }

  async update(id: number, data: UpdateDriverDto) {
    const old = await this.findById(id);

    // Check if license number is being changed and if it already exists
    if (data.licenseNumber && data.licenseNumber !== old.licenseNumber) {
      const existing = await this.prisma.driver.findUnique({
        where: { licenseNumber: data.licenseNumber },
      });
      if (existing) {
        throw new ConflictException(`Driver with license number ${data.licenseNumber} already exists`);
      }
    }

    // Check if email is being changed and if it already exists
    if (data.email && data.email !== old.email) {
      const existing = await this.prisma.driver.findUnique({
        where: { email: data.email },
      });
      if (existing) {
        throw new ConflictException(`Driver with email ${data.email} already exists`);
      }
    }

    const updateData: any = { ...data };
    if (data.licenseExpiry) {
      updateData.licenseExpiry = new Date(data.licenseExpiry);
    }

    const updated = await this.prisma.driver.update({
      where: { id },
      data: updateData,
    });

    await this.auditService.log('UPDATE', 'DRIVER', id, {
      oldValues: old,
      newValues: updated,
    });

    return updated;
  }

  async delete(id: number) {
    const driver = await this.findById(id);

    const deleted = await this.prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.auditService.log('SOFT_DELETE', 'DRIVER', id, {

      oldValues: driver,
    });

    return deleted;
  }

  async activate(id: number) {
    const driver = await this.findById(id);
    
    if (driver.isActive) {
      throw new BadRequestException('Driver is already active');
    }

    // Check if license is expired
    if (new Date(driver.licenseExpiry) < new Date()) {
      throw new BadRequestException('Cannot activate driver with expired license');
    }

    const updated = await this.prisma.driver.update({
      where: { id },
      data: { isActive: true },
    });

    await this.auditService.log('ACTIVATE', 'DRIVER', id, {
      oldValues: driver,
      newValues: updated,
    });

    return updated;
  }

  async deactivate(id: number) {
    const driver = await this.findById(id);
    
    if (!driver.isActive) {
      throw new BadRequestException('Driver is already inactive');
    }

    // Check if driver has active trips
    const activeTrips = await this.prisma.trip.count({
      where: {
        driverId: id,
        status: { in: ['IN_PROGRESS', 'PENDING'] },
      },
    });

    if (activeTrips > 0) {
      throw new BadRequestException('Cannot deactivate driver with active trips');
    }

    const updated = await this.prisma.driver.update({
      where: { id },
      data: { isActive: false },
    });

    await this.auditService.log('DEACTIVATE', 'DRIVER', id, {
      oldValues: driver,
      newValues: updated,
    });

    return updated;
  }

  async getDriversWithExpiringLicenses(days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.driver.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        licenseExpiry: {
          lte: futureDate,
        },
      },
      orderBy: { licenseExpiry: 'asc' },
    });
  }

  async getDriverStats() {
    const [total, active, inactive, withExpiredLicense] = await Promise.all([
      this.prisma.driver.count({ where: { deletedAt: null } }),
      this.prisma.driver.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.driver.count({ where: { isActive: false, deletedAt: null } }),
      this.prisma.driver.count({
        where: {
          isActive: true,
          deletedAt: null,
          licenseExpiry: { lt: new Date() },
        },
      }),
    ]);

    return { total, active, inactive, withExpiredLicense };
  }
}