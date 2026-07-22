import { Module } from '@nestjs/common';
import { FuelRecordsService } from './fuel-records.service';
import { FuelRecordsController } from './fuel-records.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FuelRecordsController],
  providers: [FuelRecordsService],
  exports: [FuelRecordsService],
})
export class FuelRecordsModule {}