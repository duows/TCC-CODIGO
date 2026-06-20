import { Module } from '@nestjs/common';
import { CspService } from './csp.service';
import { ComponentsModule } from '../components/components.module';
import { ExplanationsModule } from '../explanations/explanations.module';

@Module({
  imports: [ComponentsModule, ExplanationsModule],
  providers: [CspService],
  exports: [CspService],
})
export class CspModule {}
