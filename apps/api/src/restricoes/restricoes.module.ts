import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RestricoesController } from './restricoes.controller';
import { RestricoesService } from './restricoes.service';

@Module({
  imports: [PrismaModule],
  controllers: [RestricoesController],
  providers: [RestricoesService],
})
export class RestricoesModule {}
