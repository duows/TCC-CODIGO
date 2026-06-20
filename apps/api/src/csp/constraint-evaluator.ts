/**
 * Avaliador de Restrições — motor genérico EAV.
 *
 * Função pura que decide se um par (v ∈ Dom(Xi), w ∈ Dom(Xj))
 * satisfaz uma restrição binária. Não conhece "socket", "tdp" nem
 * qualquer termo técnico — opera apenas sobre operadores genéricos
 * e ids de características (Mackworth, 1977).
 *
 * Operadores suportados:
 *   IGUAL          — val1 === val2 (strings; ex.: socket, padrão DDR)
 *   MAIOR_OU_IGUAL — Number(val2) >= Number(val1) * Number(parametro)
 *                    Convenção: car1=demanda/consumo, car2=capacidade/oferta.
 *                    Ex.: car1=tdp(CPU), car2=potencia(Fonte), parametro="1.25"
 *                    → fonte.potencia >= cpu.tdp * 1.25
 *
 * Contrato semântico: `valorVar1` corresponde a `restricao.variavelDemanda`;
 * `valorVar2` corresponde a `restricao.variavelCapacidade`.
 * O `ac3.ts` reordena os argumentos nos arcos reversos.
 */

import type { Componente } from '@hardware-csp/shared-types';
import type { RestricaoInterna } from './types';

export function avaliarRestricao(
  valorVar1: Componente,
  valorVar2: Componente,
  restricao: RestricaoInterna,
): boolean {
  const val1 = getValor(valorVar1, restricao.caracteristica1Id);
  const val2 = getValor(valorVar2, restricao.caracteristica2Id);

  console.log('[DEBUG EVAL] comp1=%s val1=%s | comp2=%s val2=%s | op=%s param=%s', valorVar1.nome, val1, valorVar2.nome, val2, restricao.operador, restricao.parametro); // DEBUG

  // Sem dados suficientes → não bloqueia (dados faltantes não geram erro)
  if (val1 === undefined || val2 === undefined) return true;

  if (restricao.operador === 'IGUAL') {
    const resultado = val1 === val2; // DEBUG
    console.log('[DEBUG EVAL] IGUAL: "%s" === "%s" → %s', val1, val2, resultado); // DEBUG
    return resultado; // DEBUG
  }

  // MAIOR_OU_IGUAL: val2 (capacidade) >= val1 (demanda) * parametro
  const parametro = Number(restricao.parametro ?? '1');
  const resultado = Number(val2) >= Number(val1) * parametro; // DEBUG
  console.log('[DEBUG EVAL] MAIOR_OU_IGUAL: %s >= %s × %s → %s', val2, val1, parametro, resultado); // DEBUG
  return resultado; // DEBUG
}

function getValor(componente: Componente, caracteristicaId: string): string | undefined {
  return componente.caracteristicas.find((c) => c.caracteristicaId === caracteristicaId)?.valor;
}
