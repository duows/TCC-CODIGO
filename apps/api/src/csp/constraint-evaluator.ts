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

  // Sem dados suficientes → não bloqueia (dados faltantes não geram erro)
  if (val1 === undefined || val2 === undefined) return true;

  switch (restricao.operador) {
    case 'IGUAL':
      return val1 === val2;
    case 'MAIOR_OU_IGUAL': {
      // val2 (capacidade) >= val1 (demanda) * parametro
      const parametro = Number(restricao.parametro ?? '1');
      return Number(val2) >= Number(val1) * parametro;
    }
    default: {
      const _exaustivo: never = restricao.operador;
      throw new Error(`Operador de restrição não suportado: ${_exaustivo}`);
    }
  }
}

function getValor(componente: Componente, caracteristicaId: string): string | undefined {
  return componente.caracteristicas.find((c) => c.caracteristicaId === caracteristicaId)?.valor;
}
