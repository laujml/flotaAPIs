import { PartialType } from '@nestjs/swagger';
import { CreateFuelRecordDto } from './create-fuel-record.dto';

export class UpdateFuelRecordDto extends PartialType(CreateFuelRecordDto) {}