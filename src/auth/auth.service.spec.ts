import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockUsersService = {
    toResponse: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, fallback: string) => fallback),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockConfigService.get.mockImplementation((key: string, fallback: string) => fallback);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should login with valid credentials', async () => {
    const user = {
      id: 1,
      name: 'Admin',
      email: 'admin@fleet.local',
      password: 'hashed-password',
      roleId: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: { name: 'admin' },
    };
    const safeUser = {
      id: 1,
      name: 'Admin',
      email: 'admin@fleet.local',
      role: 'admin' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrismaService.user.findUnique.mockResolvedValue(user);
    mockUsersService.toResponse.mockReturnValue(safeUser);
    mockJwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login('admin@fleet.local', 'Password123!');

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: safeUser,
    });
  });

  it('should reject invalid credentials', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'Admin',
      email: 'admin@fleet.local',
      password: 'hashed-password',
      roleId: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: { name: 'admin' },
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login('admin@fleet.local', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should refresh tokens with a valid refresh token', async () => {
    const user = {
      id: 1,
      name: 'Admin',
      email: 'admin@fleet.local',
      password: 'hashed-password',
      roleId: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: { name: 'admin' },
    };
    const safeUser = {
      id: 1,
      name: 'Admin',
      email: 'admin@fleet.local',
      role: 'admin' as const,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockJwtService.verifyAsync.mockResolvedValue({
      sub: 1,
      email: 'admin@fleet.local',
      role: 'admin',
    });
    mockPrismaService.user.findUnique.mockResolvedValue(user);
    mockUsersService.toResponse.mockReturnValue(safeUser);
    mockJwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const result = await service.refresh('valid-refresh-token');

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: safeUser,
    });
  });

  it('should reject an invalid refresh token', async () => {
    mockJwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
  });
});
