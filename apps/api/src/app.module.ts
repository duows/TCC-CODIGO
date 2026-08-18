import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ComponentsModule } from './components/components.module';
import { CspModule } from './csp/csp.module';
import { ExplanationsModule } from './explanations/explanations.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { RestricoesModule } from './restricoes/restricoes.module';
import { MarcasModule } from './marcas/marcas.module';
import { CaracteristicasModule } from './caracteristicas/caracteristicas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    CategoriasModule,
    ComponentsModule,
    CspModule,
    ExplanationsModule,
    ConfigurationsModule,
    RestricoesModule,
    MarcasModule,
    CaracteristicasModule,
  ],
})
export class AppModule {}
