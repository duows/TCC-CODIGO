import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CaracteristicasController } from './caracteristicas.controller';
import { CaracteristicasService } from './caracteristicas.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CaracteristicasController],
  providers: [CaracteristicasService],
})
export class CaracteristicasModule {}
