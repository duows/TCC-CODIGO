import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ComponentesController } from './componentes.controller';
import { ComponentesService } from './componentes.service';

@Module({
  imports: [AuthModule],
  controllers: [ComponentesController],
  providers: [ComponentesService],
  exports: [ComponentesService],
})
export class ComponentesModule {}
