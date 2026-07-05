import { Controller, Get } from '@nestjs/common';
import { RestricoesService } from './restricoes.service';

@Controller('restricoes')
export class RestricoesController {
  constructor(private readonly service: RestricoesService) {}

  /**
   * GET /api/restricoes/ajustaveis
   * Lista restrições cujo parametro pode ser sobrescrito pelo usuário
   * (ex.: margem de segurança da fonte). O frontend usa isto para
   * descobrir os ids a enviar em `ajustes` no POST /configurations/validate.
   */
  @Get('ajustaveis')
  async listarAjustaveis() {
    return this.service.listarAjustaveis();
  }
}
