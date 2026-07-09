import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Post()
  create(@Body() createDriverDto: CreateDriverDto) {
    return this.driversService.create(createDriverDto);
  }

  @Get()
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.driversService.findAll(includeInactive === 'true');
  }

  @Get('stats')
  getStats() {
    return this.driversService.getDriverStats();
  }

  @Get('expiring-licenses')
  @ApiQuery({ name: 'days', required: false, type: Number })
  getExpiringLicenses(@Query('days') days?: string) {
    return this.driversService.getDriversWithExpiringLicenses(days ? parseInt(days) : 30);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.findById(id);
  }

  @Get('license/:licenseNumber')
  findByLicense(@Param('licenseNumber') licenseNumber: string) {
    return this.driversService.findByLicenseNumber(licenseNumber);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, updateDriverDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.delete(id);
  }

  @Put(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.activate(id);
  }

  @Put(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.deactivate(id);
  }
}