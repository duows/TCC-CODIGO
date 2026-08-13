/**
 * =============================================================================
 * BENCHMARK — Geração de tabelas LaTeX (booktabs)  ⚠ BASELINE EXPERIMENTAL
 *
 * Não é funcionalidade do sistema (ver README.md). Lê as medições do benchmark
 * (em memória, via `gerarTabelas`, ou de `output/benchmark.csv`, via `main`) e
 * emite três tabelas LaTeX prontas para o capítulo de Resultados do TCC:
 *
 *   - tabela_regime1.tex     (tab:bench-regime1)     — regime irrestrito
 *   - tabela_regime2.tex     (tab:bench-regime2)     — regime seleção parcial
 *   - tabela_comparativa.tex (tab:bench-comparativa) — os dois regimes num d fixo
 *
 * LaTeX puro colável; depende apenas do pacote `booktabs`. O texto usa acentos
 * UTF-8 diretos (compilar com inputenc utf8 / LuaLaTeX / XeLaTeX — padrão hoje).
 *
 * Uso standalone (regenera as tabelas a partir do CSV, sem re-rodar o benchmark):
 *   pnpm --filter @hardware-csp/api benchmark:tables
 * =============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

export type Regime = 'irrestrito' | 'selecao_parcial';

/** Uma linha de medição — espelha exatamente as colunas do CSV. */
export interface LinhaBenchmark {
  regime: Regime;
  d: number;
  motor: 'ac3' | 'forca_bruta';
  combinacoesTotaisTeoricas: bigint; // d^5
  checagens: number;
  tempoMsMediano: number;
  espacoResidual: number | null; // AC-3 apenas
  configuracoesValidas: number | null; // força bruta apenas
  concluido: boolean;
  observacao: string;
}

// ---------------------------------------------------------------------------
// Formatação de números para LaTeX
// ---------------------------------------------------------------------------

/**
 * Inteiros pequenos e grandes, sempre via \num{} (siunitx aplica separador de
 * milhar e vírgula decimal conforme o \sisetup do preâmbulo do TCC). Números
 * grandes usam notação `e` (ex.: `1.50e8`), que o siunitx renderiza como
 * $1{,}50\times10^{8}$ — não montar a notação científica manualmente aqui.
 */
function texInt(n: number | bigint): string {
  const v = typeof n === 'bigint' ? n : Math.round(n);
  const num = Number(v);
  if (Math.abs(num) < 1_000_000) {
    return `\\num{${v.toString()}}`;
  }
  const exp = Math.floor(Math.log10(Math.abs(num)));
  const mant = num / 10 ** exp;
  return `\\num{${mant.toFixed(2)}e${exp}}`;
}

/** Tempo em ms com 3 casas, via \num{} (vírgula decimal aplicada pelo siunitx). */
function texMs(ms: number): string {
  return `\\num{${ms.toFixed(3)}}`;
}

const SIM_NAO = (b: boolean) => (b ? 'sim' : 'não');

// ---------------------------------------------------------------------------
// Indexação das linhas
// ---------------------------------------------------------------------------

interface ParMotores {
  ac3?: LinhaBenchmark;
  fb?: LinhaBenchmark;
}

function indexar(linhas: LinhaBenchmark[], regime: Regime): Map<number, ParMotores> {
  const mapa = new Map<number, ParMotores>();
  for (const l of linhas) {
    if (l.regime !== regime) continue;
    const par = mapa.get(l.d) ?? {};
    if (l.motor === 'ac3') par.ac3 = l;
    else par.fb = l;
    mapa.set(l.d, par);
  }
  return mapa;
}

function dsOrdenados(mapa: Map<number, ParMotores>): number[] {
  return [...mapa.keys()].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Montagem comum da tabela (\resizebox só encolhe, nunca estica; caption/
// label ficam fora, não escalados)
// ---------------------------------------------------------------------------

function montarTabela(caption: string, label: string, colSpec: string, cabecalho: string, corpo: string[]): string {
  return [
    '\\begin{table}[htbp]',
    '  \\centering',
    `  \\caption{${caption}}`,
    `  \\label{${label}}`,
    '  \\resizebox{\\ifdim\\width>\\linewidth\\linewidth\\else\\width\\fi}{!}{%',
    `    \\begin{tabular}{${colSpec}}`,
    '      \\toprule',
    `      ${cabecalho} \\\\`,
    '      \\midrule',
    ...corpo,
    '      \\bottomrule',
    '    \\end{tabular}%',
    '  }',
    '  \\fonte{Elaborada pelo autor}',
    '\\end{table}',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Tabela — Regime 1 (irrestrito)
// ---------------------------------------------------------------------------

function tabelaRegime1(linhas: LinhaBenchmark[]): string {
  const mapa = indexar(linhas, 'irrestrito');
  const corpo = dsOrdenados(mapa).map((d) => {
    const { ac3, fb } = mapa.get(d)!;
    const celulas = [
      d,
      texInt(ac3?.checagens ?? 0),
      texMs(ac3?.tempoMsMediano ?? 0),
      texInt(fb?.checagens ?? 0),
      texMs(fb?.tempoMsMediano ?? 0),
      SIM_NAO(fb?.concluido ?? false),
      texInt(ac3?.espacoResidual ?? 0),
    ].join(' & ');
    return `      ${celulas} \\\\`;
  });

  return montarTabela(
    'Regime irrestrito (domínios cheios): comparação AC-3 versus força bruta. ' +
      'A força bruta é abortada no teto a partir de $d=50$ (coluna FB concl.\\ passa a não); ' +
      'o espaço residual do AC-3 permanece igual a $d^5$, pois sem seleção nenhum valor perde suporte.',
    'tab:bench-regime1',
    'rrrrrcr',
    '$d$ & AC-3 checagens & AC-3 tempo (ms) & FB checagens & FB tempo (ms) & FB concl. & Espaço residual',
    corpo,
  );
}

// ---------------------------------------------------------------------------
// Tabela — Regime 2 (seleção parcial)
// ---------------------------------------------------------------------------

function tabelaRegime2(linhas: LinhaBenchmark[]): string {
  const mapa = indexar(linhas, 'selecao_parcial');
  const corpo = dsOrdenados(mapa).map((d) => {
    const { ac3, fb } = mapa.get(d)!;
    const dpot5 = ac3?.combinacoesTotaisTeoricas ?? 0n;
    const residual = ac3?.espacoResidual ?? 0;
    const reducao = residual > 0 ? Math.round(Number(dpot5) / residual) : 0;
    const celulas = [
      d,
      texInt(ac3?.checagens ?? 0),
      texMs(ac3?.tempoMsMediano ?? 0),
      texInt(fb?.checagens ?? 0),
      texMs(fb?.tempoMsMediano ?? 0),
      SIM_NAO(fb?.concluido ?? false),
      texInt(residual),
      `$\\times$${texInt(reducao)}`,
    ].join(' & ');
    return `      ${celulas} \\\\`;
  });

  return montarTabela(
    'Regime seleção parcial (CPU fixada em soquete AM5): a arco-consistência poda as placas ' +
      'de outro soquete e propaga à RAM. O espaço residual do AC-3 cai muito abaixo de $d^5$ ' +
      '(coluna Redução $= d^5/\\text{residual}$), evidenciando a poda efetiva. A coluna $d^5$ foi ' +
      'omitida por já constar na Tabela~\\ref{tab:bench-regime1}.',
    'tab:bench-regime2',
    'rrrrrcrr',
    '$d$ & AC-3 checagens & AC-3 tempo (ms) & FB checagens & FB tempo (ms) & FB concl. & Residual & Redução',
    corpo,
  );
}

// ---------------------------------------------------------------------------
// Tabela — comparativa (um d fixo, os dois regimes lado a lado)
// ---------------------------------------------------------------------------

function escolherD(linhas: LinhaBenchmark[], preferido: number): number {
  const ds = [...new Set(linhas.map((l) => l.d))].sort((a, b) => a - b);
  if (ds.includes(preferido)) return preferido;
  return ds[Math.floor(ds.length / 2)] ?? preferido;
}

function tabelaComparativa(linhas: LinhaBenchmark[], preferido: number): string {
  const d = escolherD(linhas, preferido);
  const irr = indexar(linhas, 'irrestrito').get(d) ?? {};
  const sel = indexar(linhas, 'selecao_parcial').get(d) ?? {};

  const linha = (rotulo: string, a: string, b: string) => `      ${rotulo} & ${a} & ${b} \\\\`;

  const corpo = [
    linha('Espaço residual (AC-3)', texInt(irr.ac3?.espacoResidual ?? 0), texInt(sel.ac3?.espacoResidual ?? 0)),
    linha('$d^5$ (teórico)', texInt(irr.ac3?.combinacoesTotaisTeoricas ?? 0n), texInt(sel.ac3?.combinacoesTotaisTeoricas ?? 0n)),
    linha('AC-3 checagens', texInt(irr.ac3?.checagens ?? 0), texInt(sel.ac3?.checagens ?? 0)),
    linha('AC-3 tempo (ms)', texMs(irr.ac3?.tempoMsMediano ?? 0), texMs(sel.ac3?.tempoMsMediano ?? 0)),
    linha('FB checagens', texInt(irr.fb?.checagens ?? 0), texInt(sel.fb?.checagens ?? 0)),
    linha('FB concl.', SIM_NAO(irr.fb?.concluido ?? false), SIM_NAO(sel.fb?.concluido ?? false)),
    linha(
      'FB config.\\ válidas',
      irr.fb?.concluido ? texInt(irr.fb?.configuracoesValidas ?? 0) : '---',
      sel.fb?.concluido ? texInt(sel.fb?.configuracoesValidas ?? 0) : '---',
    ),
  ];

  return montarTabela(
    `Comparação dos dois regimes para $d=${d}$. Sem seleção, o espaço residual do AC-3 ` +
      'iguala $d^5$ (ganho puramente algorítmico, menos checagens); com seleção parcial, a poda ' +
      'propagada reduz o residual em ordens de magnitude.',
    'tab:bench-comparativa',
    'lrr',
    'Métrica & Irrestrito & Seleção parcial',
    corpo,
  );
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** Gera as três tabelas .tex em `outDir`. `comparativaD` = d da tabela comparativa. */
export function gerarTabelas(linhas: LinhaBenchmark[], outDir: string, comparativaD = 50): void {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'tabela_regime1.tex'), tabelaRegime1(linhas), 'utf8');
  fs.writeFileSync(path.join(outDir, 'tabela_regime2.tex'), tabelaRegime2(linhas), 'utf8');
  fs.writeFileSync(path.join(outDir, 'tabela_comparativa.tex'), tabelaComparativa(linhas, comparativaD), 'utf8');
}

// ---------------------------------------------------------------------------
// Leitura do CSV (para regeneração standalone)
// ---------------------------------------------------------------------------

function lerCsv(caminho: string): LinhaBenchmark[] {
  const texto = fs.readFileSync(caminho, 'utf8').trim();
  const [cabecalho, ...linhas] = texto.split(/\r?\n/);
  const cols = cabecalho!.split(',');
  const idx = (nome: string) => cols.indexOf(nome);

  return linhas.map((linha) => {
    const c = linha.split(',');
    const val = (nome: string) => c[idx(nome)] ?? '';
    const numOuNull = (s: string) => (s === '' ? null : Number(s));
    return {
      regime: val('regime') as Regime,
      d: Number(val('d')),
      motor: val('motor') as 'ac3' | 'forca_bruta',
      combinacoesTotaisTeoricas: BigInt(val('combinacoes_totais_teoricas')),
      checagens: Number(val('checagens_avaliadas')),
      tempoMsMediano: Number(val('tempo_ms_mediano')),
      espacoResidual: numOuNull(val('espaco_residual')),
      configuracoesValidas: numOuNull(val('configuracoes_validas')),
      concluido: val('concluido') === 'true',
      observacao: val('observacao'),
    };
  });
}

function main(): void {
  const outDir = path.join(__dirname, 'output');
  const csv = path.join(outDir, 'benchmark.csv');
  if (!fs.existsSync(csv)) {
    console.error(`CSV não encontrado: ${csv}\nRode o benchmark antes (pnpm ... benchmark).`);
    process.exit(1);
  }
  const linhas = lerCsv(csv);
  gerarTabelas(linhas, outDir);
  console.log(`Tabelas LaTeX geradas em: ${outDir}`);
  console.log('  - tabela_regime1.tex, tabela_regime2.tex, tabela_comparativa.tex');
}

// Executa como CLI apenas quando chamado diretamente (não quando importado).
if (require.main === module) {
  main();
}
