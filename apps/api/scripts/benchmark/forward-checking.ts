/**
 * =============================================================================
 * BENCHMARK — Motor de FORWARD CHECKING (busca com poda antecipada)
 *
 * ⚠ BASELINE EXPERIMENTAL — NÃO é funcionalidade do sistema. Serve apenas para
 *   comparação no capítulo de Resultados do TCC. Vive fora da camada de API,
 *   sem controller nem rota (ver README.md).
 *
 * Referência:
 *   - Russell, S.; Norvig, P. (2010). Artificial Intelligence: A Modern Approach.
 *     3rd ed. Prentice Hall. (Capítulo 6 — Constraint Satisfaction Problems)
 *
 * Atribui as variáveis uma a uma na ordem canônica `CATEGORIAS_ORDENADAS` e, a
 * cada atribuição, PODA os domínios das vizinhas ainda não atribuídas, removendo
 * os valores sem suporte. Se algum domínio esvazia, o valor corrente é
 * descartado sem descer na árvore — é essa antecipação que distingue o forward
 * checking do backtracking puro.
 *
 * Forma CANÔNICA, sem otimizações: sem MRV (as variáveis seguem a ordem fixa) e
 * sem ordenação de valores (o domínio é percorrido na ordem de inserção). A
 * comparação com o AC-3 mede o efeito da propagação, não o de heurísticas.
 *
 * NÃO reimplementa lógica de compatibilidade: reusa o avaliador de produção
 * `avaliarRestricao`. O import abaixo é um named import comum — o MESMO caminho
 * que `src/csp/ac3.ts` usa. Como o app compila para CommonJS, ele vira um lookup
 * VIVO de propriedade no módulo, então o wrapper instalado por
 * `instrumentation.ts` conta as checagens deste motor automaticamente, sem que
 * nada aqui precise conhecer o contador (ver instrumentation.ts).
 * =============================================================================
 */

import type { Componente } from '@hardware-csp/shared-types';
import type { VariavelCSP, RestricaoInterna } from '../../src/csp/types';
import { avaliarRestricao } from '../../src/csp/constraint-evaluator';
import { CATEGORIAS_ORDENADAS, clonarVariaveis } from './scenario';

export interface ResultadoForwardChecking {
  /** true se encontrou uma atribuição completa consistente. */
  consistente: boolean;
}

/** Domínios indexados por categoriaId — a estrutura podada ao longo da busca. */
type Dominios = Map<string, Map<string, Componente>>;

/** Posição de cada categoria na ordem de atribuição (categoriaId → índice). */
type Posicoes = Map<string, number>;

interface ResultadoPropagacao {
  podados: Dominios;
  vazio: boolean;
}

/**
 * Ponto de entrada do motor.
 *
 * Clona as variáveis recebidas (`clonarVariaveis`) para nunca mutar o cenário
 * compartilhado com os outros motores, reindexa na ordem canônica e delega à
 * recursão.
 */
export function rodarForwardChecking(
  variaveis: VariavelCSP[],
  restricoes: RestricaoInterna[],
): ResultadoForwardChecking {
  const copia = clonarVariaveis(variaveis);

  // Reindexa a cópia na ordem canônica (CPU, Placa, RAM, GPU, Fonte).
  const ordenadas: VariavelCSP[] = [];
  for (const categoriaId of CATEGORIAS_ORDENADAS) {
    const variavel = copia.find((v) => v.categoriaId === categoriaId);
    if (variavel) ordenadas.push(variavel);
  }

  const dominios: Dominios = new Map();
  const posDe: Posicoes = new Map();
  ordenadas.forEach((v, idx) => {
    dominios.set(v.categoriaId, v.dominio);
    posDe.set(v.categoriaId, idx);
  });

  return { consistente: fc(0, ordenadas, dominios, restricoes, posDe) };
}

// ---------------------------------------------------------------------------
// Recursão
// ---------------------------------------------------------------------------

/**
 * Tenta atribuir a variável na posição `indice`, testando cada valor do seu
 * domínio corrente. Retorna true assim que uma atribuição completa é fechada.
 */
function fc(
  indice: number,
  ordenadas: VariavelCSP[],
  dominios: Dominios,
  restricoes: RestricaoInterna[],
  posDe: Posicoes,
): boolean {
  // Todas as variáveis atribuídas ⇒ solução completa encontrada.
  if (indice === ordenadas.length) return true;

  const varAtual = ordenadas[indice]!;
  const dominioAtual = dominios.get(varAtual.categoriaId);
  if (!dominioAtual) return false;

  for (const componente of Array.from(dominioAtual.values())) {
    const { podados, vazio } = propaga(
      varAtual.categoriaId,
      componente,
      indice,
      dominios,
      restricoes,
      posDe,
    );

    // Domínio de alguma vizinha esvaziou ⇒ descarta o valor sem descer.
    if (vazio) continue;

    if (fc(indice + 1, ordenadas, podados, restricoes, posDe)) return true;
  }

  return false;
}

/**
 * Forward check: fixa `compAtual` em `catAtual` e poda os domínios das vizinhas
 * AINDA NÃO ATRIBUÍDAS (posição > indice), mantendo apenas os valores que têm
 * suporte na restrição.
 *
 * Trabalha sobre uma cópia profunda dos Maps — o nível acima da recursão nunca
 * é mutado, então o backtracking é implícito (basta descartar `podados`).
 */
function propaga(
  catAtual: string,
  compAtual: Componente,
  indice: number,
  dominios: Dominios,
  restricoes: RestricaoInterna[],
  posDe: Posicoes,
): ResultadoPropagacao {
  const novos: Dominios = new Map();
  for (const [categoriaId, dominio] of dominios) {
    novos.set(categoriaId, new Map(dominio));
  }
  novos.set(catAtual, new Map([[compAtual.id, compAtual]]));

  for (const restricao of restricoes) {
    // Self-loop (demanda === capacidade): não há vizinha a podar.
    // Mesma guarda do ac3.ts ao montar a lista de adjacência.
    if (restricao.variavelDemanda === restricao.variavelCapacidade) continue;

    // A vizinha é a outra ponta da restrição; se catAtual não é ponta, ignora.
    let catVizinha: string;
    if (restricao.variavelDemanda === catAtual) {
      catVizinha = restricao.variavelCapacidade;
    } else if (restricao.variavelCapacidade === catAtual) {
      catVizinha = restricao.variavelDemanda;
    } else {
      continue;
    }

    // Só poda vizinhas ainda não atribuídas.
    const posVizinha = posDe.get(catVizinha);
    if (posVizinha === undefined || posVizinha <= indice) continue;

    const dominioVizinha = novos.get(catVizinha);
    if (!dominioVizinha) continue;

    const suportados = new Map<string, Componente>();
    for (const [idVizinha, compVizinha] of dominioVizinha) {
      const [valorDemanda, valorCapacidade] = orientar(compAtual, compVizinha, catAtual, restricao);
      // ← contado pelo wrapper de instrumentation.ts
      if (avaliarRestricao(valorDemanda, valorCapacidade, restricao)) {
        suportados.set(idVizinha, compVizinha);
      }
    }

    novos.set(catVizinha, suportados);
    if (suportados.size === 0) return { podados: novos, vazio: true };
  }

  return { podados: novos, vazio: false };
}

/**
 * Ordena o par de operandos conforme a orientação da restrição.
 *
 * `avaliarRestricao(demanda, capacidade, r)` NÃO é comutativa para
 * MAIOR_OU_IGUAL (capacidade >= demanda × parametro). A variável atual pode
 * estar em qualquer uma das duas pontas, então quem decide é
 * `restricao.variavelDemanda` — nunca se assume que a atual é a demanda.
 * Espelha a inversão que o `ac3.ts` faz nos arcos reversos.
 */
function orientar(
  compAtual: Componente,
  compVizinha: Componente,
  catAtual: string,
  restricao: RestricaoInterna,
): [Componente, Componente] {
  return catAtual === restricao.variavelDemanda
    ? [compAtual, compVizinha]
    : [compVizinha, compAtual];
}

// ---------------------------------------------------------------------------
// Filtragem de 1 passada (Prompt 4) — poder de poda do FC, sem busca
// ---------------------------------------------------------------------------

export interface ResultadoFiltragemFc {
  /** true se nenhum domínio ficou vazio após a passada. */
  consistente: boolean;
  /** Produto dos tamanhos de domínio após a poda. */
  espacoResidual: number;
  /** Tamanho do domínio de cada variável após a poda. */
  tamanhosPorCategoria: Record<string, number>;
}

/**
 * Mede o efeito de UMA ÚNICA passada de propagação do forward checking a
 * partir da variável já fixada (domínio de tamanho 1), sem busca — para
 * comparação direta com `ResultadoRunnerAc3.tamanhosPorCategoria`
 * (ac3-runner.ts), que reflete a arco-consistência completa do AC-3.
 *
 * Não reimplementa a propagação: delega a `propaga()`, chamada uma única vez
 * a partir da variável fixada. Não se aplica ao regime irrestrito (nenhuma
 * variável fixada) — lança erro explícito em vez de devolver um resultado
 * enganoso, mesmo padrão de `aplicarSelecaoParcialCpu` em scenario.ts.
 */
export function filtrarForwardChecking(
  variaveis: VariavelCSP[],
  restricoes: RestricaoInterna[],
): ResultadoFiltragemFc {
  const copia = clonarVariaveis(variaveis);

  // Reindexa a cópia na ordem canônica (CPU, Placa, RAM, GPU, Fonte).
  const ordenadas: VariavelCSP[] = [];
  for (const categoriaId of CATEGORIAS_ORDENADAS) {
    const variavel = copia.find((v) => v.categoriaId === categoriaId);
    if (variavel) ordenadas.push(variavel);
  }

  const indice = ordenadas.findIndex((v) => v.dominio.size === 1);
  if (indice === -1) {
    throw new Error(
      'filtrarForwardChecking: nenhuma variável fixada (domínio de tamanho 1) — ' +
        'a medição de uma única passada não se aplica ao regime irrestrito.',
    );
  }

  const dominios: Dominios = new Map();
  const posDe: Posicoes = new Map();
  ordenadas.forEach((v, idx) => {
    dominios.set(v.categoriaId, v.dominio);
    posDe.set(v.categoriaId, idx);
  });

  const varFixada = ordenadas[indice]!;
  const compFixado = varFixada.dominio.values().next().value!;

  const { podados, vazio } = propaga(
    varFixada.categoriaId,
    compFixado,
    indice,
    dominios,
    restricoes,
    posDe,
  );

  const tamanhosPorCategoria: Record<string, number> = {};
  let espacoResidual = 1;
  for (const [categoriaId, dominio] of podados) {
    tamanhosPorCategoria[categoriaId] = dominio.size;
    espacoResidual *= dominio.size;
  }

  return { consistente: !vazio, espacoResidual, tamanhosPorCategoria };
}
