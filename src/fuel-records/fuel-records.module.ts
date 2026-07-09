import { Module } from '@nestjs/common';
import { FuelRecordsService } from './fuel-records.service';
import { FuelRecordsController } from './fuel-records.controller';

@Module({
  controllers: [FuelRecordsController],
  providers: [FuelRecordsService],
  exports: [FuelRecordsService],
})
export class FuelRecordsModule {}