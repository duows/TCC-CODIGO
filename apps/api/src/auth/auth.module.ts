import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

// Registrado como variável e reexportado (não só o Guard): módulos que
// importam AuthModule e usam @UseGuards(JwtAuthGuard) precisam de JwtService
// resolvível no próprio container deles, já que o Nest instancia o guard
// no contexto do módulo onde o controller está declarado.
const jwtModule = JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    secret: config.get<string>('JWT_SECRET'),
    signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '4h' },
  }),
});

@Module({
  imports: [ConfigModule, jwtModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard, jwtModule],
})
export class AuthModule {}
