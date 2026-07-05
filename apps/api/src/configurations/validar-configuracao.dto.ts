import { IsObject, IsOptional, IsString } from 'class-validator';
import type { EstadoConfiguracao } from '@hardware-csp/shared-types';

/**
 * DTO da requisição de validação.
 *
 * Conforme RNF-11 (API stateless), o cliente envia o estado COMPLETO
 * das seleções a cada requisição. O servidor não mantém sessão.
 */
export class ValidarConfiguracaoDto {
  @IsObject()
  estado!: EstadoConfiguracao;

  /**
   * restricaoId → parametro sobrescrito (ex.: margem de segurança da fonte).
   * Opcional — restrições não listadas aqui usam o parametro padrão do banco.
   */
  @IsOptional()
  @IsObject()
  ajustes?: Record<string, string>;
}
