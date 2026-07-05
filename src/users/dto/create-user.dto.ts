import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../common/roles/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'Nuevo Usuario' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'usuario@fleet.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: Role, example: Role.Operator })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
