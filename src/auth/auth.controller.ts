import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesion con email y password' })
  @ApiResponse({ status: 201, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens JWT' })
  @ApiResponse({ status: 201, description: 'Tokens renovados' })
  @ApiResponse({ status: 401, description: 'Refresh token invalido' })
  refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refresh(refreshTokenDto.refreshToken);
  }
}

