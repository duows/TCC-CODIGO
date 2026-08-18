import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './auth-login.dto';

/**
 * POST /api/auth/login — única rota de autenticação, pública.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.service.login(dto.senha);
  }
}
