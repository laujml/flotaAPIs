import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    action: string,
    entityType: string,
    entityId: number,
    options: {
      vehicleId?: number;
      oldValues?: Record<string, any>;
      newValues?: Record<string, any>;
      userId?: number;
      userEmail?: string;
      ipAddress?: string;
    } = {},
  ) {
    const changedFields = this.getChangedFields(options.oldValues, options.newValues);

    return this.prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        vehicleId: options.vehicleId,
        changedFields: changedFields.length > 0 ? JSON.stringify(changedFields) : null,
        oldValues: options.oldValues ? JSON.stringify(options.oldValues) : null,
        newValues: options.newValues ? JSON.stringify(options.newValues) : null,
        userId: options.userId,
        userEmail: options.userEmail,
        ipAddress: options.ipAddress,
      },
    });
  }

  private getChangedFields(
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
  ): string[] {
    if (!oldValues || !newValues) return [];

    return Object.keys(newValues).filter((key) => oldValues[key] !== newValues[key]);
  }

  async getVehicleAuditHistory(vehicleId: number) {
    return this.prisma.auditLog.findMany({
      where: { vehicleId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getEntityAuditHistory(entityType: string, entityId: number) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getAuditsByAction(action: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
