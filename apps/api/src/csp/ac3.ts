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
  const listaAdjacencia = construirListaAdjacencia(restricoes);

  while (fila.length > 0) {
    const arco = fila.shift()!;
    const removidosNesteArco = revisar(arco, variaveis);

    if (removidosNesteArco.length === 0) continue;

    removidos.push(...removidosNesteArco);

    const dominioOrigem = getDominio(variaveis, arco.origem);
    if (!dominioOrigem || dominioOrigem.size === 0) {
      continue;
    }

    // Reinserir arcos (Xk → Xi) para cada vizinho Xk de Xi, Xk ≠ Xj.
    for (const vizinho of arcosVizinhos(arco.origem, arco.destino, listaAdjacencia)) {
      fila.push(vizinho);
    }
  }

  const consistente = variaveis.every((v) => v.dominio.size > 0);
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
  if (valoresDestino.length === 0) return removidos;

  for (const v of Array.from(varOrigem.dominio.values())) {
    const temSuporte = valoresDestino.some((w) =>
      arcoReverso
        ? avaliarRestricao(w, v, arco.restricao)
        : avaliarRestricao(v, w, arco.restricao),
    );

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
 * Lista de adjacência do grafo de restrições (Capítulo 2 do TCC): para cada
 * variável Xi, os arcos (Xk → Xi) que a afetam. Construída uma única vez por
 * execução do ac3(), permitindo consulta O(grau(Xi)) em vez da varredura
 * O(|restricoes|) anterior.
 */
type ListaAdjacencia = Map<string, Arco[]>;

/**
 * Constrói a lista de adjacência a partir das restrições do grafo.
 *
 * Para cada restrição, o arco (capacidade → demanda) sempre entra na lista
 * da variável demanda. O arco (demanda → capacidade) só é adicionado à parte
 * quando as duas variáveis são distintas — isso evita duplicar o mesmo arco
 * em restrições "self-loop" (variavelDemanda === variavelCapacidade),
 * reproduzindo fielmente a precedência if/else da varredura original.
 */
function construirListaAdjacencia(restricoes: RestricaoInterna[]): ListaAdjacencia {
  const mapa: ListaAdjacencia = new Map();
  const adicionar = (chave: string, arco: Arco) => {
    const lista = mapa.get(chave);
    if (lista) lista.push(arco);
    else mapa.set(chave, [arco]);
  };

  for (const r of restricoes) {
    adicionar(r.variavelDemanda, { origem: r.variavelCapacidade, destino: r.variavelDemanda, restricao: r });
    if (r.variavelDemanda !== r.variavelCapacidade) {
      adicionar(r.variavelCapacidade, { origem: r.variavelDemanda, destino: r.variavelCapacidade, restricao: r });
    }
  }
  return mapa;
}

/**
 * Retorna os arcos (Xk → Xi) para cada vizinho Xk de Xi, excluindo Xj.
 * Consulta a lista de adjacência em vez de varrer todas as restrições.
 */
function arcosVizinhos(
  origem: string,
  excluir: string,
  listaAdjacencia: ListaAdjacencia,
): Arco[] {
  return (listaAdjacencia.get(origem) ?? []).filter((a) => a.origem !== excluir);
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
