/**
 * =============================================================================
 * BENCHMARK — Expoente empírico de crescimento (AC-3 vs Forward Checking)
 * ⚠ BASELINE EXPERIMENTAL — NÃO é funcionalidade do sistema.
 *
 * Estima o expoente empírico de crescimento do custo (nº de checagens de
 * restrição) em função do tamanho de domínio `d`, por regressão de mínimos
 * quadrados de ln(checagens) contra ln(d) — ou seja, ajusta checagens ≈ c·d^k
 * e reporta `k` (coeficiente angular) e R² (qualidade do ajuste).
 *
 * NÃO roda o benchmark nem gera dados novos. Usa exclusivamente valores já
 * medidos:
 *   - AC-3   → lidos de `output/benchmark.csv` (`motor=ac3`), 7 valores de d
 *              (10,25,50,75,100,250,500) nos 2 regimes.
 *   - Forward checking → NÃO existe CSV com `motor=fc` (harness.ts mantém o FC
 *              fora de LinhaBenchmark/CSV/.tex de propósito — ver comentário
 *              em harness.ts e nota de escopo em RELATORIO-FORWARD-CHECKING.md
 *              §5.2 — para não sobrescrever a linha da força bruta em
 *              tables.ts). Os 14 valores (medianas de 5 execuções, mesma
 *              rodada de 18/07/2026) são transcritos abaixo verbatim de
 *              RELATORIO-FORWARD-CHECKING.md §3, mesma fonte já usada por
 *              plot_fc.py.
 *
 * Cada motor × regime é reportado em duas janelas: todos os 7 valores de `d`,
 * e só `d >= 100` (3 pontos), onde o comportamento assintótico se manifesta
 * com menos influência de termos constantes.
 *
 * Só imprime no console — não escreve CSV nem .tex novos.
 *
 * Uso (standalone, sem re-rodar o benchmark):
 *   pnpm --filter @hardware-csp/api benchmark:expoente
 * =============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

type Regime = 'irrestrito' | 'selecao_parcial';
type Motor = 'ac3' | 'fc';

interface PontoMedido {
  regime: Regime;
  d: number;
  checagens: number;
}

// ---------------------------------------------------------------------------
// Dados do AC-3 — lidos de output/benchmark.csv (motor=ac3)
// ---------------------------------------------------------------------------

function lerAc3DoCsv(caminho: string): PontoMedido[] {
  const texto = fs.readFileSync(caminho, 'utf8').trim();
  const [cabecalho, ...linhas] = texto.split(/\r?\n/);
  const cols = cabecalho!.split(',');
  const idx = (nome: string) => cols.indexOf(nome);

  const pontos: PontoMedido[] = [];
  for (const linha of linhas) {
    const c = linha.split(',');
    const val = (nome: string) => c[idx(nome)] ?? '';
    if (val('motor') !== 'ac3') continue;
    pontos.push({
      regime: val('regime') as Regime,
      d: Number(val('d')),
      checagens: Number(val('checagens_avaliadas')),
    });
  }
  return pontos;
}

// ---------------------------------------------------------------------------
// Dados do Forward Checking — transcritos de RELATORIO-FORWARD-CHECKING.md §3
// (não existe CSV com motor=fc; ver banner acima)
// ---------------------------------------------------------------------------

const FC_DADOS: PontoMedido[] = [
  { regime: 'irrestrito', d: 10, checagens: 40 },
  { regime: 'irrestrito', d: 25, checagens: 100 },
  { regime: 'irrestrito', d: 50, checagens: 200 },
  { regime: 'irrestrito', d: 75, checagens: 300 },
  { regime: 'irrestrito', d: 100, checagens: 400 },
  { regime: 'irrestrito', d: 250, checagens: 1000 },
  { regime: 'irrestrito', d: 500, checagens: 2000 },
  { regime: 'selecao_parcial', d: 10, checagens: 40 },
  { regime: 'selecao_parcial', d: 25, checagens: 100 },
  { regime: 'selecao_parcial', d: 50, checagens: 200 },
  { regime: 'selecao_parcial', d: 75, checagens: 300 },
  { regime: 'selecao_parcial', d: 100, checagens: 400 },
  { regime: 'selecao_parcial', d: 250, checagens: 1000 },
  { regime: 'selecao_parcial', d: 500, checagens: 2000 },
];

// ---------------------------------------------------------------------------
// Regressão log-log por mínimos quadrados
// ---------------------------------------------------------------------------

interface Ajuste {
  expoente: number; // coeficiente angular de ln(checagens) sobre ln(d)
  intercepto: number;
  r2: number;
  n: number;
}

function ajustarLogLog(pontos: PontoMedido[]): Ajuste {
  const xs = pontos.map((p) => Math.log(p.d));
  const ys = pontos.map((p) => Math.log(p.checagens));
  const n = xs.length;

  const mediaX = xs.reduce((a, b) => a + b, 0) / n;
  const mediaY = ys.reduce((a, b) => a + b, 0) / n;

  let sXY = 0;
  let sXX = 0;
  for (let i = 0; i < n; i++) {
    sXY += (xs[i]! - mediaX) * (ys[i]! - mediaY);
    sXX += (xs[i]! - mediaX) ** 2;
  }
  const expoente = sXY / sXX;
  const intercepto = mediaY - expoente * mediaX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const previsto = intercepto + expoente * xs[i]!;
    ssRes += (ys[i]! - previsto) ** 2;
    ssTot += (ys[i]! - mediaY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { expoente, intercepto, r2, n };
}

// ---------------------------------------------------------------------------
// Saída em console — mesmo padrão de harness.ts (col() com padStart)
// ---------------------------------------------------------------------------

const col = (s: string | number, n: number) => String(s).padStart(n);

function imprimirAjustes(porRegime: Map<Regime, PontoMedido[]>, motor: Motor): void {
  console.log(`\n--- ${motor === 'ac3' ? 'AC-3' : 'Forward Checking'} — expoente empírico (ln checagens ~ k·ln d) ---`);
  console.log(
    [col('regime', 16), col('janela', 12), col('n', 3), col('expoente k', 11), col('R²', 8)].join(' '),
  );
  for (const [regime, pontos] of porRegime) {
    const todos = ajustarLogLog(pontos);
    const dMaiorOuIgual100 = pontos.filter((p) => p.d >= 100);
    const restrito = ajustarLogLog(dMaiorOuIgual100);
    console.log(
      [
        col(regime, 16),
        col('todos os d', 12),
        col(todos.n, 3),
        col(todos.expoente.toFixed(4), 11),
        col(todos.r2.toFixed(6), 8),
      ].join(' '),
    );
    console.log(
      [
        col(regime, 16),
        col('d >= 100', 12),
        col(restrito.n, 3),
        col(restrito.expoente.toFixed(4), 11),
        col(restrito.r2.toFixed(6), 8),
      ].join(' '),
    );
  }
}

function imprimirRazoes(porRegime: Map<Regime, PontoMedido[]>, motor: Motor): void {
  console.log(`\n--- ${motor === 'ac3' ? 'AC-3' : 'Forward Checking'} — razão checagens/d ---`);
  console.log([col('regime', 16), col('d', 5), col('checagens', 10), col('checagens/d', 12)].join(' '));
  for (const [regime, pontos] of porRegime) {
    for (const p of [...pontos].sort((a, b) => a.d - b.d)) {
      console.log(
        [col(regime, 16), col(p.d, 5), col(p.checagens, 10), col((p.checagens / p.d).toFixed(4), 12)].join(' '),
      );
    }
  }
}

function agruparPorRegime(pontos: PontoMedido[]): Map<Regime, PontoMedido[]> {
  const mapa = new Map<Regime, PontoMedido[]>();
  for (const p of pontos) {
    const lista = mapa.get(p.regime) ?? [];
    lista.push(p);
    mapa.set(p.regime, lista);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Verificação do teto teórico O(c·d³) — RNF-02 / Seção 2.6
// ---------------------------------------------------------------------------

function verificarTetoTeorico(ac3PorRegime: Map<Regime, PontoMedido[]>): void {
  console.log('\n--- Verificação do teto teórico (AC-3 = O(c·d³), RNF-02 / Seção 2.6) ---');
  let algumViolou = false;
  for (const [regime, pontos] of ac3PorRegime) {
    const todos = ajustarLogLog(pontos).expoente;
    const restrito = ajustarLogLog(pontos.filter((p) => p.d >= 100)).expoente;
    const viola = todos >= 3 || restrito >= 3;
    if (viola) algumViolou = true;
    console.log(
      `  ${regime}: expoente(todos)=${todos.toFixed(4)}  expoente(d>=100)=${restrito.toFixed(4)}  ` +
        `${viola ? '✗ VIOLA o teto de 3' : '✓ abaixo do teto de 3'}`,
    );
  }
  console.log(algumViolou ? '✗ ALGUM expoente do AC-3 atingiu ou passou de 3.' : '✓ Todos os expoentes do AC-3 ficam abaixo de 3.');
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  const csv = path.join(__dirname, 'output', 'benchmark.csv');
  if (!fs.existsSync(csv)) {
    console.error(`CSV não encontrado: ${csv}\nEsse script não roda o benchmark — rode-o antes (pnpm ... benchmark).`);
    process.exit(1);
  }

  const ac3Pontos = lerAc3DoCsv(csv);
  const ac3PorRegime = agruparPorRegime(ac3Pontos);
  const fcPorRegime = agruparPorRegime(FC_DADOS);

  console.log('===================================================================');
  console.log(' Expoente empírico de crescimento — AC-3 vs Forward Checking');
  console.log(' (regressão log-log sobre valores já medidos; nenhum dado novo)');
  console.log('===================================================================');

  imprimirAjustes(ac3PorRegime, 'ac3');
  imprimirRazoes(ac3PorRegime, 'ac3');
  imprimirAjustes(fcPorRegime, 'fc');
  imprimirRazoes(fcPorRegime, 'fc');
  verificarTetoTeorico(ac3PorRegime);
}

// Executa como CLI apenas quando chamado diretamente (não quando importado).
if (require.main === module) {
  main();
}
