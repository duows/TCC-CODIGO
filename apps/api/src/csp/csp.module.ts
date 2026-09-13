import { Module } from '@nestjs/common';
import { CspService } from './csp.service';
import { ComponentesModule } from '../componentes/componentes.module';
import { ExplanationsModule } from '../explanations/explanations.module';

@Module({
  imports: [ComponentesModule, ExplanationsModule],
  providers: [CspService],
  exports: [CspService],
})
export class CspModule {}
