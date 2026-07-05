import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ComponentsModule } from './components/components.module';
import { CspModule } from './csp/csp.module';
import { ExplanationsModule } from './explanations/explanations.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { RestricoesModule } from './restricoes/restricoes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    CategoriasModule,
    ComponentsModule,
    CspModule,
    ExplanationsModule,
    ConfigurationsModule,
    RestricoesModule,
  ],
})
export class AppModule {}
