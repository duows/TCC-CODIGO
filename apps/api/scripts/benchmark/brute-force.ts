/**
 * =============================================================================
 * BENCHMARK — Motor de FORÇA BRUTA (produto cartesiano)
 *
 * ⚠ BASELINE EXPERIMENTAL — NÃO é funcionalidade do sistema. Serve apenas para
 *   comparação no capítulo de Resultados do TCC. Viola RNF-02/RNF-06 se exposta;
 *   por isso vive fora da camada de API, sem controller nem rota (ver README.md).
 *
 * Enumera TODAS as atribuições completas (uma componente por categoria) — o
 * produto cartesiano dos 5 domínios, tamanho d⁵. Para cada atribuição avalia
 * TODAS as restrições reusando o avaliador de produção (`avaliarViaModulo` →
 * `avaliarRestricao`), respeitando a orientação demanda→capacidade de cada
 * RestricaoInterna. NÃO reimplementa lógica de compatibilidade.
 *
 * Teto de aborto: interrompe se ultrapassar `maxCombos` combinações OU `maxMs`
 * de tempo de parede (o que vier primeiro), registrando `concluido = false`.
 * =============================================================================
 */

import type { Componente } from '@hardware-csp/shared-types';
import type { RestricaoInterna } from '../../src/csp/types';
import { CATEGORIAS_ORDENADAS } from './scenario';
import { avaliarViaModulo } from './instrumentation';

export interface TetoAborto {
  /** Tempo de parede máximo em milissegundos. */
  maxMs: number;
  /** Número máximo de combinações avaliadas. */
  maxCombos: number;
}

export interface ResultadoForcaBruta {
  /** Nº de atribuições completas que satisfazem todas as restrições. */
  validas: number;
  /** Nº de combinações efetivamente avaliadas (≤ d⁵; menor se abortou). */
  combinacoes: number;
  /** false se o teto de aborto foi atingido antes de esgotar o produto. */
  concluido: boolean;
}

// Verifica o teto de tempo a cada 2^20 combinações (evita custo do hrtime por iteração).
const MASCARA_CHECAGEM_TEMPO = 0xfffff;

/**
 * Executa a força bruta sobre os 5 domínios (na ordem de CATEGORIAS_ORDENADAS).
 */
export function forcaBruta(
  dominios: Componente[][],
  restricoes: RestricaoInterna[],
  teto: TetoAborto,
): ResultadoForcaBruta {
  // Posição de cada categoria na tupla de atribuição (alinha com `dominios`).
  const posDe = new Map<string, number>();
  CATEGORIAS_ORDENADAS.forEach((catId, idx) => posDe.set(catId, idx));

  // Pré-computa a orientação demanda→capacidade de cada restrição como índices.
  const arestas = restricoes.map((r) => ({
    restricao: r,
    demanda: posDe.get(r.variavelDemanda)!,
    capacidade: posDe.get(r.variavelCapacidade)!,
  }));

  const [dCpu, dPlaca, dRam, dGpu, dFonte] = dominios;

  const inicio = process.hrtime.bigint();
  const limiteNs = BigInt(Math.round(teto.maxMs)) * 1_000_000n;

  let validas = 0;
  let combinacoes = 0;
  const atribuicao: Componente[] = new Array(5);

  // 5 laços aninhados = produto cartesiano das 5 variáveis.
  for (const cpu of dCpu!) {
    atribuicao[0] = cpu;
    for (const placa of dPlaca!) {
      atribuicao[1] = placa;
      for (const ram of dRam!) {
        atribuicao[2] = ram;
        for (const gpu of dGpu!) {
          atribuicao[3] = gpu;
          for (const fonte of dFonte!) {
            atribuicao[4] = fonte;

            combinacoes++;

            // Avalia todas as restrições; para no primeiro conflito.
            let compativel = true;
            for (const a of arestas) {
              if (!avaliarViaModulo(atribuicao[a.demanda]!, atribuicao[a.capacidade]!, a.restricao)) {
                compativel = false;
                break;
              }
            }
            if (compativel) validas++;

            // Teto de aborto.
            if (combinacoes >= teto.maxCombos) {
              return { validas, combinacoes, concluido: false };
            }
            if ((combinacoes & MASCARA_CHECAGEM_TEMPO) === 0) {
              if (process.hrtime.bigint() - inicio > limiteNs) {
                return { validas, combinacoes, concluido: false };
              }
            }
          }
        }
      }
    }
  }

  return { validas, combinacoes, concluido: true };
}
