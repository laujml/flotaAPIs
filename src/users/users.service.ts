import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../common/roles/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

type UserWithRole = {
  id: number;
  name: string;
  email: string;
  role: { name: string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { id: 'asc' },
    });

    return users.map((user) => this.toResponse(user));
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  async create(createUserDto: CreateUserDto) {
    await this.ensureEmailIsAvailable(createUserDto.email);
    const role = await this.findRole(createUserDto.role);
    const password = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password,
        roleId: role.id,
        isActive: createUserDto.isActive ?? true,
      },
      include: { role: true },
    });

    return this.toResponse(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      await this.ensureEmailIsAvailable(updateUserDto.email);
    }

    const role = updateUserDto.role ? await this.findRole(updateUserDto.role) : undefined;
    const password = updateUserDto.password
      ? await bcrypt.hash(updateUserDto.password, 10)
      : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: updateUserDto.name,
        email: updateUserDto.email,
        password,
        roleId: role?.id,
        isActive: updateUserDto.isActive,
      },
      include: { role: true },
    });

    return this.toResponse(user);
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deletedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: { role: true },
    });

    return this.toResponse(deletedUser);
  }

  toResponse(user: UserWithRole): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name as Role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async findRole(name: Role) {
    const role = await this.prisma.role.findUnique({ where: { name } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  private async ensureEmailIsAvailable(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      throw new ConflictException('Email already exists');
    }
  }
}

