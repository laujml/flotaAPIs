import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const safeUser = this.usersService.toResponse(user);

    return {
      accessToken: await this.signAccessToken(safeUser),
      refreshToken: await this.signRefreshToken(safeUser),
      user: safeUser,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'local-dev-refresh-secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const safeUser = this.usersService.toResponse(user);

      return {
        accessToken: await this.signAccessToken(safeUser),
        refreshToken: await this.signRefreshToken(safeUser),
        user: safeUser,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async signAccessToken(user: UserResponseDto) {
    return this.jwtService.signAsync(this.buildPayload(user), {
      secret: this.configService.get<string>('JWT_SECRET', 'local-dev-access-secret'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m'),
    });
  }

  private async signRefreshToken(user: UserResponseDto) {
    return this.jwtService.signAsync(this.buildPayload(user), {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'local-dev-refresh-secret'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  private buildPayload(user: UserResponseDto): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }
}

