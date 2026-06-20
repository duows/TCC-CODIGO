import { Module } from '@nestjs/common';
import { ConfigurationsController } from './configurations.controller';
import { CspModule } from '../csp/csp.module';

@Module({
  imports: [CspModule],
  controllers: [ConfigurationsController],
})
export class ConfigurationsModule {}
