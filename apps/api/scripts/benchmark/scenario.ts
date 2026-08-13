/**
 * =============================================================================
 * BENCHMARK — Gerador de cenário sintético
 *
 * ⚠ BASELINE EXPERIMENTAL — não é funcionalidade do sistema (ver README.md).
 *
 * Constrói, EM MEMÓRIA, a tripla CSP <X, D, C> no mesmo formato consumido pelo
 * motor `ac3()` e pelo avaliador `avaliarRestricao()` de produção. Segue o
 * padrão de fixtures de `src/csp/ac3.spec.ts` (helpers de VariavelCSP + objetos
 * RestricaoInterna literais), SEM Prisma e sem tocar o banco.
 *
 * As 5 categorias, as 4 restrições e as convenções demanda/capacidade são
 * idênticas às cadastradas em `prisma/seed.ts`. Os valores NUMÉRICOS (tdp,
 * potência) são sorteados de faixas reais por um PRNG semeado (mulberry32); os
 * valores CATEGÓRICOS (soquete, padrão DDR) são atribuídos por round-robin
 * DETERMINÍSTICO. Isso garante, independente de (d, seed), duas propriedades
 * exigidas pelo capítulo de Resultados (RNF-10 — determinismo):
 *
 *   (a) Regime IRRESTRITO — sem poda: CPU e Placa cobrem o mesmo conjunto de
 *       soquetes (suporte mútuo), RAM e Placa cobrem ambos os padrões DDR, e há
 *       ao menos uma Fonte que atende ao pior caso de potência ⇒ nenhuma
 *       variável tem valor sem suporte ⇒ AC-3 não remove nada ⇒ residual = d⁵.
 *
 *   (b) Regime SELEÇÃO PARCIAL — poda garantida: existe ≥1 CPU AM5 e placas de
 *       soquetes variados; fixar a CPU em AM5 remove as placas de outro soquete
 *       e, como o padrão DDR da placa é derivado do soquete (AM5→DDR5), a poda
 *       PROPAGA para a RAM (DDR4 perde suporte).
 * =============================================================================
 */

import type { VariavelCSP, RestricaoInterna } from '../../src/csp/types';
import type { Componente, CaracteristicaValor } from '@hardware-csp/shared-types';

// ---------------------------------------------------------------------------
// Identidade das variáveis (X) e características — IDs fixos
// ---------------------------------------------------------------------------

export const CAT = {
  CPU: 'cat-cpu',
  PLACA: 'cat-placa',
  RAM: 'cat-ram',
  GPU: 'cat-gpu',
  FONTE: 'cat-fonte',
} as const;

/** Ordem canônica das variáveis do CSP (define a ordem do produto cartesiano). */
export const CATEGORIAS_ORDENADAS: string[] = [
  CAT.CPU,
  CAT.PLACA,
  CAT.RAM,
  CAT.GPU,
  CAT.FONTE,
];

const CAR = {
  CPU_SOCKET: 'car-cpu-socket',
  CPU_TDP: 'car-cpu-tdp',
  PLACA_SOCKET: 'car-placa-socket',
  PLACA_PADRAO: 'car-placa-padrao',
  RAM_PADRAO: 'car-ram-padrao',
  GPU_TDP: 'car-gpu-tdp',
  FONTE_POTENCIA: 'car-fonte-potencia',
} as const;

// ---------------------------------------------------------------------------
// Pools reais de valores (idênticos ao domínio físico do problema)
// ---------------------------------------------------------------------------

const SOQUETES = ['AM4', 'AM5', 'LGA1700', 'LGA1851'];
const PADROES_DDR = ['DDR4', 'DDR5'];
const FAIXA_TDP_CPU = { min: 35, max: 170 }; // W
const FAIXA_TDP_GPU = { min: 75, max: 450 }; // W
const FAIXA_POTENCIA_FONTE = { min: 300, max: 1000 }; // W

/** Soquete AM5 é o ponto de fixação do Regime 2 (seleção parcial). */
const SOCKET_AM5 = 'AM5';

/**
 * Padrão de memória suportado por uma placa-mãe, DERIVADO do seu soquete —
 * regra fisicamente realista que também garante a propagação da poda à RAM no
 * Regime 2: AM4 é plataforma DDR4; AM5 e as LGA modernas são DDR5.
 */
function ddrDoSocket(socket: string): string {
  return socket === 'AM4' ? 'DDR4' : 'DDR5';
}

// ---------------------------------------------------------------------------
// PRNG determinístico — mulberry32 (32-bit, período 2^32)
// ---------------------------------------------------------------------------

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// ---------------------------------------------------------------------------
// Fábrica de componentes EAV
// ---------------------------------------------------------------------------

function car(
  caracteristicaId: string,
  nome: string,
  tipo: CaracteristicaValor['tipo'],
  valor: string,
): CaracteristicaValor {
  return { caracteristicaId, nome, tipo, valor };
}

function componente(
  id: string,
  categoriaId: string,
  caracteristicas: CaracteristicaValor[],
): Componente {
  return { id, nome: id, marcaNome: 'Sintetico', categoriaId, caracteristicas };
}

// ---------------------------------------------------------------------------
// Restrições (conjunto C) — idênticas ao seed de produção
// ---------------------------------------------------------------------------

/** Restrições binárias do grafo. Convenção: car1 = demanda, car2 = capacidade. */
export const RESTRICOES: RestricaoInterna[] = [
  {
    id: 'r-socket',
    variavelDemanda: CAT.CPU,
    variavelCapacidade: CAT.PLACA,
    caracteristica1Id: CAR.CPU_SOCKET,
    caracteristica2Id: CAR.PLACA_SOCKET,
    operador: 'IGUAL',
    templateJustificativa: 'socket',
  },
  {
    id: 'r-memoria',
    variavelDemanda: CAT.RAM,
    variavelCapacidade: CAT.PLACA,
    caracteristica1Id: CAR.RAM_PADRAO,
    caracteristica2Id: CAR.PLACA_PADRAO,
    operador: 'IGUAL',
    templateJustificativa: 'memoria',
  },
  {
    id: 'r-tdp-cpu',
    variavelDemanda: CAT.CPU,
    variavelCapacidade: CAT.FONTE,
    caracteristica1Id: CAR.CPU_TDP,
    caracteristica2Id: CAR.FONTE_POTENCIA,
    operador: 'MAIOR_OU_IGUAL',
    parametro: '1.25',
    templateJustificativa: 'tdp-cpu',
  },
  {
    id: 'r-tdp-gpu',
    variavelDemanda: CAT.GPU,
    variavelCapacidade: CAT.FONTE,
    caracteristica1Id: CAR.GPU_TDP,
    caracteristica2Id: CAR.FONTE_POTENCIA,
    operador: 'MAIOR_OU_IGUAL',
    parametro: '1.25',
    templateJustificativa: 'tdp-gpu',
  },
];

// ---------------------------------------------------------------------------
// Geração do cenário
// ---------------------------------------------------------------------------

export interface Cenario {
  /** Variáveis com domínios completos (Map<id, Componente>). */
  variaveis: VariavelCSP[];
  /** Domínios como arrays, na ordem de CATEGORIAS_ORDENADAS (para a força bruta). */
  dominios: Componente[][];
  /** Restrições binárias do grafo. */
  restricoes: RestricaoInterna[];
}

/**
 * Gera um cenário com `d` componentes por categoria (5 categorias → domínio total d).
 * Determinístico em (d, seed).
 */
export function gerarCenario(d: number, seed: number): Cenario {
  const rng = mulberry32(seed);

  const cpus: Componente[] = [];
  const placas: Componente[] = [];
  const rams: Componente[] = [];
  const gpus: Componente[] = [];
  const fontes: Componente[] = [];

  for (let i = 0; i < d; i++) {
    // Soquetes por round-robin: CPU e Placa percorrem o MESMO ciclo, garantindo
    // suporte mútuo (nenhuma poda no Regime 1) e ≥1 AM5 + variedade (Regime 2).
    const socketCpu = SOQUETES[i % SOQUETES.length]!;
    const socketPlaca = SOQUETES[i % SOQUETES.length]!;

    cpus.push(
      componente(`cpu-${i}`, CAT.CPU, [
        car(CAR.CPU_SOCKET, 'socket', 'TEXTO', socketCpu),
        car(CAR.CPU_TDP, 'tdp', 'INTEIRO', String(randInt(rng, FAIXA_TDP_CPU.min, FAIXA_TDP_CPU.max))),
      ]),
    );
    placas.push(
      componente(`placa-${i}`, CAT.PLACA, [
        car(CAR.PLACA_SOCKET, 'socketSuportado', 'TEXTO', socketPlaca),
        // Padrão DDR derivado do soquete (realista): garante a propagação à RAM.
        car(CAR.PLACA_PADRAO, 'padraoMemoria', 'TEXTO', ddrDoSocket(socketPlaca)),
      ]),
    );
    rams.push(
      componente(`ram-${i}`, CAT.RAM, [
        // RAM alterna DDR4/DDR5 (ambos presentes ⇒ sem poda no Regime 1).
        car(CAR.RAM_PADRAO, 'padrao', 'TEXTO', PADROES_DDR[i % PADROES_DDR.length]!),
      ]),
    );
    gpus.push(
      componente(`gpu-${i}`, CAT.GPU, [
        car(CAR.GPU_TDP, 'tdp', 'INTEIRO', String(randInt(rng, FAIXA_TDP_GPU.min, FAIXA_TDP_GPU.max))),
      ]),
    );
    fontes.push(
      componente(`fonte-${i}`, CAT.FONTE, [
        // fonte-0 é o pior caso (potência máxima): assegura suporte a qualquer
        // CPU (≤170·1.25) e GPU (≤450·1.25) ⇒ nenhuma poda de TDP no Regime 1.
        car(
          CAR.FONTE_POTENCIA,
          'potencia',
          'INTEIRO',
          i === 0
            ? String(FAIXA_POTENCIA_FONTE.max)
            : String(randInt(rng, FAIXA_POTENCIA_FONTE.min, FAIXA_POTENCIA_FONTE.max)),
        ),
      ]),
    );
  }

  const dominios: Componente[][] = [cpus, placas, rams, gpus, fontes];

  const variaveis: VariavelCSP[] = CATEGORIAS_ORDENADAS.map((categoriaId, idx) => {
    const dominio = new Map<string, Componente>();
    for (const c of dominios[idx]!) dominio.set(c.id, c);
    return { categoriaId, dominio };
  });

  return { variaveis, dominios, restricoes: RESTRICOES };
}

/** Clona variáveis (domínios em Maps novos) — cada execução do AC-3 recebe cópia fresca. */
export function clonarVariaveis(vars: VariavelCSP[]): VariavelCSP[] {
  return vars.map((v) => ({ categoriaId: v.categoriaId, dominio: new Map(v.dominio) }));
}

// ---------------------------------------------------------------------------
// Regime 2 — seleção parcial (simula o wizard fixando a CPU)
// ---------------------------------------------------------------------------

export interface CenarioSelecaoParcial {
  /** Variáveis com o domínio da CPU colapsado ao componente fixado. */
  variaveis: VariavelCSP[];
  /** Domínios como arrays, com `dominios[0]` (CPU) reduzido ao componente fixado. */
  dominios: Componente[][];
  /** Componente CPU (AM5) escolhido para a fixação. */
  cpuFixada: Componente;
}

/**
 * Deriva de um cenário irrestrito o cenário do Regime 2: fixa a variável CPU em
 * um único componente de soquete AM5 (o primeiro encontrado). Isso força a
 * arco-consistência a podar placas de outro soquete e, por transitividade
 * (padrão DDR da placa derivado do soquete), a RAM.
 *
 * Não muta o cenário original (clona variáveis e recria o array de domínios).
 * Lança erro se o cenário não contiver nenhuma CPU AM5 (não deve ocorrer, dado
 * o round-robin de soquetes; salvaguarda defensiva).
 */
export function aplicarSelecaoParcialCpu(cenario: Cenario): CenarioSelecaoParcial {
  const cpus = cenario.dominios[0]!;
  const cpuFixada = cpus.find((c) =>
    c.caracteristicas.some((car) => car.caracteristicaId === CAR.CPU_SOCKET && car.valor === SOCKET_AM5),
  );
  if (!cpuFixada) {
    throw new Error('Cenário sem CPU AM5 — não é possível montar o Regime 2 (seleção parcial).');
  }

  const variaveis = clonarVariaveis(cenario.variaveis);
  const varCpu = variaveis.find((v) => v.categoriaId === CAT.CPU)!;
  varCpu.dominio = new Map([[cpuFixada.id, cpuFixada]]);

  const dominios = cenario.dominios.map((dom, idx) => (idx === 0 ? [cpuFixada] : dom));

  return { variaveis, dominios, cpuFixada };
}
