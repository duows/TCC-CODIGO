import { Body, Controller, Post } from '@nestjs/common';
import { CspService } from '../csp/csp.service';
import { ValidarConfiguracaoDto } from './validar-configuracao.dto';
import type { RespostaValidacao } from '@hardware-csp/shared-types';

@Controller('configurations')
export class ConfigurationsController {
  constructor(private readonly csp: CspService) {}

  /**
   * POST /api/configurations/validate
   *
   * Endpoint principal do sistema. Recebe o estado atual das seleções
   * do usuário e devolve os domínios atualizados após propagação AC-3
   * (RF-05, RF-09) juntamente com as justificativas educativas (RF-10).
   *
   * Stateless conforme RNF-11 — todo contexto vem no body.
   */
  @Post('validate')
  async validar(@Body() dto: ValidarConfiguracaoDto): Promise<RespostaValidacao> {
    return this.csp.validar(dto.estado);
  }
}
