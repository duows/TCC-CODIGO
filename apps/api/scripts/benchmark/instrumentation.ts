/**
 * =============================================================================
 * BENCHMARK — Instrumentação do avaliador de restrições
 *
 * ⚠ BASELINE EXPERIMENTAL — não é funcionalidade do sistema (ver README.md).
 *
 * Injeta um CONTADOR de checagens de restrição em torno do avaliador de
 * produção `avaliarRestricao`, SEM alterar `constraint-evaluator.ts` nem
 * `ac3.ts`. A métrica "checagens avaliadas" é independente de máquina e
 * comparável entre os dois motores.
 *
 * COMO FUNCIONA (por que não precisa tocar o núcleo):
 *   O app compila para CommonJS. O `import { avaliarRestricao }` em `ac3.ts`
 *   vira, no código emitido, um lookup VIVO de propriedade
 *   (`constraint_evaluator_1.avaliarRestricao(...)`). Como este módulo faz
 *   `require` do MESMO arquivo, ambos compartilham a mesma entrada de
 *   require-cache. Ao reatribuir `mod.avaliarRestricao` por um wrapper, tanto o
 *   AC-3 quanto a força bruta passam a chamar o wrapper — mesmo avaliador,
 *   mesmo contador. `restaurar()` devolve a função original.
 * =============================================================================
 */

import type { Componente } from '@hardware-csp/shared-types';
import type { RestricaoInterna } from '../../src/csp/types';

// Tipo da função de avaliação de produção.
type Avaliador = (v1: Componente, v2: Componente, r: RestricaoInterna) => boolean;

// require() do MESMO módulo que o ac3.ts importa (mesma entrada de cache).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mod: { avaliarRestricao: Avaliador } = require('../../src/csp/constraint-evaluator');

/** Contador global de checagens de restrição (uma por chamada ao avaliador). */
export const contador = {
  checagens: 0,
  reset(): void {
    this.checagens = 0;
  },
};

let original: Avaliador | null = null;

/**
 * Instala o wrapper de contagem sobre o avaliador de produção.
 * Idempotente: chamar duas vezes não empilha wrappers.
 */
export function instalarContador(): void {
  if (original) return; // já instalado
  original = mod.avaliarRestricao;
  const alvo = original;
  mod.avaliarRestricao = (v1, v2, r) => {
    contador.checagens++;
    return alvo(v1, v2, r);
  };
}

/** Restaura o avaliador de produção original (remove a contagem). */
export function restaurar(): void {
  if (!original) return;
  mod.avaliarRestricao = original;
  original = null;
}

/**
 * Avalia uma restrição pelo avaliador VIVO do módulo (o wrapper, se instalado).
 * A força bruta usa esta função para garantir que suas checagens também sejam
 * contadas e que a lógica de compatibilidade NÃO seja reimplementada.
 */
export function avaliarViaModulo(
  v1: Componente,
  v2: Componente,
  r: RestricaoInterna,
): boolean {
  return mod.avaliarRestricao(v1, v2, r);
}
