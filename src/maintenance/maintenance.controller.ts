import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maintenance')
export class MaintenanceController {
  constructor(private maintenanceService: MaintenanceService) {}

  @Post()
  create(@Body() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenanceService.create(createMaintenanceDto);
  }

  @Get()
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.findById(id);
  }

  @Get('vehicle/:vehicleId')
  findByVehicle(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenanceService.findByVehicle(vehicleId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaintenanceDto: UpdateMaintenanceDto,
  ) {
    return this.maintenanceService.update(id, updateMaintenanceDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.maintenanceService.delete(id);
  }

  @Post(':id/complete')
  completeMaintenance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { cost: number },
  ) {
    return this.maintenanceService.completeMaintenance(id, body.cost);
  }

  @Get('vehicle/:vehicleId/pending')
  getPendingMaintenances(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenanceService.getPendingMaintenances(vehicleId);
  }

  @Get('vehicle/:vehicleId/completed')
  getCompletedMaintenances(@Param('vehicleId', ParseIntPipe) vehicleId: number) {
    return this.maintenanceService.getCompletedMaintenances(vehicleId);
  }
}
