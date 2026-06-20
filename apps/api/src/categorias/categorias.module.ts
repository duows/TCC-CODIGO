import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CategoriasController } from './categorias.controller';
import { CategoriasService } from './categorias.service';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriasController],
  providers: [CategoriasService],
})
export class CategoriasModule {}
