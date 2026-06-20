/**
 * Tipos internos do motor CSP/AC-3.
 *
 * Representa a tripla <X, D, C> conforme Russell e Norvig (2010):
 *   X = conjunto de variáveis (categorias — ids vindos do banco)
 *   D = domínio de cada variável (componentes genéricos EAV)
 *   C = restrições binárias do grafo (carregadas da tabela restricao)
 */

import type { Componente } from '@hardware-csp/shared-types';

/**
 * Uma variável do CSP com seu domínio atual.
 * `categoriaId` é o UUID da categoria no banco (não um tipo fixo).
 *
 * O domínio é mantido como Map<id, Componente> para:
 *   - lookup O(1) durante propagação;
 *   - remoção O(1) durante poda;
 *   - iteração ordenada quando necessário.
 */
export interface VariavelCSP {
  categoriaId: string;
  dominio: Map<string, Componente>;
}

/**
 * Arco direcionado (Xi → Xj) — unidade de processamento do AC-3.
 * Origem e destino são categoriaIds (strings).
 */
export interface Arco {
  origem: string;
  destino: string;
  restricao: RestricaoInterna;
}

/**
 * Restrição binária hidratada (vinda da tabela `restricao` do banco).
 *
 * variavelDemanda / variavelCapacidade: categoriaIds das variáveis envolvidas,
 * derivados em runtime (caracteristica.categoriaId).
 *
 * Operadores:
 *   IGUAL          — val1 === val2 (comparação de strings)
 *   MAIOR_OU_IGUAL — Number(val2) >= Number(val1) * Number(parametro)
 *                    (convenção: car1=demanda, car2=capacidade)
 */
export interface RestricaoInterna {
  id: string;
  variavelDemanda: string;     // categoriaId do lado demanda (car1)
  variavelCapacidade: string;  // categoriaId do lado capacidade (car2)
  caracteristica1Id: string;
  caracteristica2Id: string;
  operador: 'IGUAL' | 'MAIOR_OU_IGUAL';
  parametro?: string;          // ex.: "1.25" para TDP
  templateJustificativa: string;
}

/**
 * Resultado de uma remoção de valor durante propagação.
 * Usado pelo motor de explicações (RF-10 a RF-13).
 */
export interface ValorRemovido {
  categoriaId: string;
  componenteId: string;
  componente: Componente;
  restricaoViolada: RestricaoInterna;
  /** Componente que causou a remoção (âncora no domínio vizinho) */
  ancora?: Componente;
}
