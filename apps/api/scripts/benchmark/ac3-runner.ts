/**
 * =============================================================================
 * BENCHMARK — Runner do motor AC-3
 *
 * ⚠ BASELINE EXPERIMENTAL — não é funcionalidade do sistema (ver README.md).
 *
 * Envelopa a função pura de produção `ac3()` (src/csp/ac3.ts) para medição.
 * Cada execução recebe uma CÓPIA fresca das variáveis (o AC-3 poda domínios
 * in-place), preservando o cenário original para a força bruta.
 *
 * Métrica reportada como "configuracoes_validas" para o AC-3:
 *   ESPAÇO RESIDUAL = produto dos tamanhos de domínio após a poda.
 *   Atenção: NÃO é a contagem exata de soluções (a força bruta produz essa).
 *   O AC-3 estabelece ARCO-CONSISTÊNCIA, não consistência global; o espaço
 *   residual é um LIMITE SUPERIOR do nº de configurações completas válidas.
 *   Serve para evidenciar a redução do espaço de busca — a comparação de
 *   corretude entre motores usa `consistente` vs `validas > 0` (ver harness).
 * =============================================================================
 */

import type { VariavelCSP, RestricaoInterna } from '../../src/csp/types';
import { ac3 } from '../../src/csp/ac3';
import { clonarVariaveis } from './scenario';

export interface ResultadoRunnerAc3 {
  /** true se nenhum domínio ficou vazio após a propagação. */
  consistente: boolean;
  /** Produto dos tamanhos de domínio após a poda (limite superior do espaço de solução). */
  espacoResidual: number;
  /** Tamanho do domínio de cada variável após a poda (categoriaId → nº de valores). */
  tamanhosPorCategoria: Record<string, number>;
}

export function rodarAc3(
  variaveis: VariavelCSP[],
  restricoes: RestricaoInterna[],
): ResultadoRunnerAc3 {
  const copia = clonarVariaveis(variaveis);
  const resultado = ac3(copia, restricoes);

  const espacoResidual = resultado.variaveis.reduce((acc, v) => acc * v.dominio.size, 1);
  const tamanhosPorCategoria: Record<string, number> = {};
  for (const v of resultado.variaveis) {
    tamanhosPorCategoria[v.categoriaId] = v.dominio.size;
  }

  return { consistente: resultado.consistente, espacoResidual, tamanhosPorCategoria };
}
