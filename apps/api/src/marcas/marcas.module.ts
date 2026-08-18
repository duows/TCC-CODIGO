import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MarcasController } from './marcas.controller';
import { MarcasService } from './marcas.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MarcasController],
  providers: [MarcasService],
})
export class MarcasModule {}
