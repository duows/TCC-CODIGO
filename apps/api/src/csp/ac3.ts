/**
 * =============================================================================
 * Algoritmo AC-3 — Arc Consistency Algorithm 3
 *
 * Referências:
 *   - Mackworth, A. K. (1977). Consistency in Networks of Relations.
 *     Artificial Intelligence, 8(1), 99–118.
 *   - Russell, S.; Norvig, P. (2010). Artificial Intelligence: A Modern Approach.
 *     3rd ed. Prentice Hall. (Capítulo 6 — Constraint Satisfaction Problems)
 *
 * Mapeamento ao TCC:
 *   - Seção 2.6 (Propagação de Restrições e Algoritmo AC-3)
 *   - RF-05  (Executar propagação de restrições via AC-3)
 *   - RF-09  (Propagar restrições incrementalmente a cada seleção)
 *   - RNF-01 (Tempo de resposta < 500ms)
 *   - RNF-02 (Ausência de avaliação por força bruta — complexidade O(c·d³))
 *   - RNF-10 (Determinismo)
 * =============================================================================
 *
 * VISÃO GERAL DO ALGORITMO (pseudocódigo de Russell & Norvig, p. 209):
 *
 *   function AC-3(csp) returns false if inconsistency found else true
 *     queue ← all arcs in csp
 *     while queue not empty do
 *       (Xi, Xj) ← Pop(queue)
 *       if Revise(csp, Xi, Xj) then
 *         if size of Dom(Xi) = 0 then return false
 *         for each Xk in Neighbors(Xi) - {Xj} do
 *           add (Xk, Xi) to queue
 *     return true
 *
 * Esta implementação é PURA: opera apenas sobre estruturas em memória
 * (sem I/O, sem Prisma), viabilizando testes unitários determinísticos
 * (RNF-10) e isolamento da camada de dados.
 *
 * Variáveis são identificadas por categoriaId (string), não por um
 * tipo fixo — o motor é agnóstico à semântica de cada categoria.
 */

import type { Arco, VariavelCSP, ValorRemovido, RestricaoInterna } from './types';
import type { Componente } from '@hardware-csp/shared-types';
import { avaliarRestricao } from './constraint-evaluator';

export interface ResultadoAC3 {
  /** false se algum domínio ficou vazio (configuração inconsistente) */
  consistente: boolean;
  /** Variáveis com seus domínios após propagação */
  variaveis: VariavelCSP[];
  /** Histórico de remoções (para o motor de explicações) */
  removidos: ValorRemovido[];
}

/**
 * Ponto de entrada do motor de inferência.
 *
 * @param variaveis  Variáveis do CSP com seus domínios INICIAIS
 *                   (já filtrados pelas atribuições do usuário, se houver).
 * @param restricoes Restrições binárias do grafo (Figura 1 do TCC).
 * @returns          Domínios atualizados após propagação + histórico de remoções.
 */
export function ac3(
  variaveis: VariavelCSP[],
  restricoes: RestricaoInterna[],
): ResultadoAC3 {
  const removidos: ValorRemovido[] = [];

  // Detecta domínio inicialmente vazio antes de qualquer propagação.
  // Sem esta verificação, uma variável sem restrições com domínio vazio
  // passaria despercebida e o algoritmo retornaria consistente=true incorretamente.
  for (const v of variaveis) {
    if (v.dominio.size === 0) {
      return { consistente: false, variaveis, removidos };
    }
  }

  const fila: Arco[] = inicializarFila(restricoes);
  console.log('[DEBUG AC3] Fila inicial: %d arcos', fila.length); // DEBUG
  fila.forEach((a, i) => console.log('[DEBUG AC3]   [%d] %s → %s | op=%s param=%s', i, a.origem, a.destino, a.restricao.operador, a.restricao.parametro)); // DEBUG

  while (fila.length > 0) {
    const arco = fila.shift()!;
    console.log('[DEBUG AC3] Processando: %s → %s | op=%s | fila restante: %d', arco.origem, arco.destino, arco.restricao.operador, fila.length); // DEBUG
    const removidosNesteArco = revisar(arco, variaveis);
    console.log('[DEBUG AC3] Removidos neste arco: %d', removidosNesteArco.length); // DEBUG

    if (removidosNesteArco.length === 0) continue;

    removidos.push(...removidosNesteArco);

    const dominioOrigem = getDominio(variaveis, arco.origem);
    if (!dominioOrigem || dominioOrigem.size === 0) {
      console.log('[DEBUG AC3] Domínio de %s vazio — continuando fila (%d arcos restantes)', arco.origem, fila.length); // DEBUG
      continue;
    }

    // Reinserir arcos (Xk → Xi) para cada vizinho Xk de Xi, Xk ≠ Xj.
    for (const vizinho of arcosVizinhos(arco.origem, arco.destino, restricoes)) {
      fila.push(vizinho);
    }
  }

  const consistente = variaveis.every((v) => v.dominio.size > 0);
  console.log('[DEBUG AC3] Fila vazia — consistente=%s', consistente); // DEBUG
  return { consistente, variaveis, removidos };
}

// ---------------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------------

/**
 * Inicializa a fila com todos os arcos do grafo de restrições.
 * Cada restrição binária gera 2 arcos: (X_i, X_j) e (X_j, X_i).
 */
function inicializarFila(restricoes: RestricaoInterna[]): Arco[] {
  const fila: Arco[] = [];
  for (const r of restricoes) {
    fila.push({ origem: r.variavelDemanda, destino: r.variavelCapacidade, restricao: r });
    fila.push({ origem: r.variavelCapacidade, destino: r.variavelDemanda, restricao: r });
  }
  return fila;
}

/**
 * Revisa um arco (origem → destino).
 *
 * Para cada valor v no domínio da variável de origem, verifica se existe
 * pelo menos UM valor w no domínio da variável de destino tal que (v, w)
 * satisfaça a restrição. Se não houver suporte, remove v.
 *
 * Trata arcos reversos: quando origem === restricao.variavelCapacidade, os argumentos
 * são invertidos para que car1 sempre mapeie para variavelDemanda no avaliador.
 *
 * @returns valores removidos do domínio da variável de origem
 */
function revisar(arco: Arco, variaveis: VariavelCSP[]): ValorRemovido[] {
  const removidos: ValorRemovido[] = [];

  const varOrigem = getVariavel(variaveis, arco.origem);
  const varDestino = getVariavel(variaveis, arco.destino);
  if (!varOrigem || !varDestino) return removidos;

  const arcoReverso = arco.origem === arco.restricao.variavelCapacidade;
  const valoresDestino = Array.from(varDestino.dominio.values());
  console.log('[DEBUG AC3]   revisar: origem=%s (%d vals) → destino=%s (%d vals) reverso=%s', arco.origem, varOrigem.dominio.size, arco.destino, varDestino.dominio.size, arcoReverso); // DEBUG
  if (valoresDestino.length === 0) return removidos;

  for (const v of Array.from(varOrigem.dominio.values())) {
    const temSuporte = valoresDestino.some((w) =>
      arcoReverso
        ? avaliarRestricao(w, v, arco.restricao)
        : avaliarRestricao(v, w, arco.restricao),
    );

    console.log('[DEBUG AC3]     val=%s temSuporte=%s', v.nome, temSuporte); // DEBUG
    if (!temSuporte) {
      varOrigem.dominio.delete(v.id);
      removidos.push({
        categoriaId: varOrigem.categoriaId,
        componenteId: v.id,
        componente: v,
        restricaoViolada: arco.restricao,
        // Usa o primeiro componente do domínio destino como âncora representativa.
        // Quando !temSuporte, NENHUM valor do destino satisfaz a restrição com v,
        // então qualquer elemento serve de exemplo para a explicação educativa.
        ancora: valoresDestino[0],
      });
    }
  }

  return removidos;
}

/**
 * Gera arcos (Xk → Xi) para cada vizinho Xk de Xi, excluindo Xj.
 * Vizinhos são derivados das restrições onde Xi aparece como variavelDemanda ou variavelCapacidade.
 */
function arcosVizinhos(
  origem: string,
  excluir: string,
  restricoes: RestricaoInterna[],
): Arco[] {
  const arcos: Arco[] = [];
  for (const r of restricoes) {
    if (r.variavelDemanda === origem && r.variavelCapacidade !== excluir) {
      arcos.push({ origem: r.variavelCapacidade, destino: origem, restricao: r });
    } else if (r.variavelCapacidade === origem && r.variavelDemanda !== excluir) {
      arcos.push({ origem: r.variavelDemanda, destino: origem, restricao: r });
    }
  }
  return arcos;
}

function getVariavel(variaveis: VariavelCSP[], categoriaId: string): VariavelCSP | undefined {
  return variaveis.find((v) => v.categoriaId === categoriaId);
}

function getDominio(
  variaveis: VariavelCSP[],
  categoriaId: string,
): Map<string, Componente> | undefined {
  return getVariavel(variaveis, categoriaId)?.dominio;
}
