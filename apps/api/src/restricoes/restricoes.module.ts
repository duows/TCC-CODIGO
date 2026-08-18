import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RestricoesController } from './restricoes.controller';
import { RestricoesService } from './restricoes.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RestricoesController],
  providers: [RestricoesService],
})
export class RestricoesModule {}
