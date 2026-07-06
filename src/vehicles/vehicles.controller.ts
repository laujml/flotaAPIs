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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  create(@Body() createVehicleDto: CreateVehicleDto) {
    return this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findById(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.delete(id);
  }

  @Post(':id/odometer')
  updateOdometer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { distance: number },
  ) {
    return this.vehiclesService.updateOdometer(id, body.distance);
  }

  @Get(':id/can-assign')
  canAssignForTrip(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.canAssignForTrip(id);
  }

  @Get(':id/maintenance-alerts')
  checkMaintenanceAlerts(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.checkMaintenanceAlerts(id);
  }
}
