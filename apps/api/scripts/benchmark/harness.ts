/**
 * =============================================================================
 * BENCHMARK — Harness (orquestrador de medição)  ⚠ BASELINE EXPERIMENTAL
 *
 * NÃO é funcionalidade do sistema. Compara o motor AC-3 de produção contra uma
 * força bruta (produto cartesiano) para o capítulo de Resultados do TCC. A força
 * bruta é apenas baseline experimental: não é exposta em rota HTTP nem chamável
 * pelo wizard (RNF-02 / RNF-06). Nada aqui altera o núcleo do AC-3 ou do
 * avaliador; a contagem de checagens é injetada só neste módulo.
 *
 * Mede DOIS regimes na mesma execução:
 *   - irrestrito      — domínios cheios; AC-3 não poda (residual = d⁵).
 *   - selecao_parcial — CPU fixada em AM5 (simula o wizard); a arco-consistência
 *                       poda placas e propaga à RAM ⇒ residual < d⁵.
 * Para cada (regime, d): executa cada motor N vezes, medindo tempo de parede
 * (hrtime) e nº de checagens de restrição (contador injetado); reporta a MEDIANA.
 * Exporta CSV consolidado + 3 tabelas LaTeX em ./output/ e um resumo no console.
 *
 * Uso:
 *   pnpm --filter @hardware-csp/api benchmark
 *   pnpm --filter @hardware-csp/api benchmark -- --d=10,25 --runs=1
 *   Opções: --d=<lista> --runs=<n> --max-ms=<ms> --max-combos=<n> --seed=<n> --tab-d=<d>
 * =============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import { gerarCenario, aplicarSelecaoParcialCpu, CAT, CATEGORIAS_ORDENADAS } from './scenario';
import { rodarAc3 } from './ac3-runner';
import { forcaBruta } from './brute-force';
import { rodarForwardChecking, filtrarForwardChecking, type ResultadoFiltragemFc } from './forward-checking';
import { contador, instalarContador, restaurar } from './instrumentation';
import { gerarTabelas, type LinhaBenchmark, type Regime } from './tables';

// ---------------------------------------------------------------------------
// Parâmetros (CLI com defaults)
// ---------------------------------------------------------------------------

function arg(nome: string): string | undefined {
  const prefixo = `--${nome}=`;
  const encontrado = process.argv.find((a) => a.startsWith(prefixo));
  return encontrado?.slice(prefixo.length);
}

const CONFIG = {
  ds: (arg('d') ?? '10,25,50,75,100,250,500').split(',').map((s) => parseInt(s.trim(), 10)),
  runs: parseInt(arg('runs') ?? '5', 10),
  maxMs: Number(arg('max-ms') ?? '10000'),
  maxCombos: Number(arg('max-combos') ?? '1e8'),
  seed: parseInt(arg('seed') ?? '12345', 10),
  tabD: parseInt(arg('tab-d') ?? '50', 10),
};

const REGIMES: Regime[] = ['irrestrito', 'selecao_parcial'];

// ---------------------------------------------------------------------------
// Utilitários de medição
// ---------------------------------------------------------------------------

/** Executa `fn` medindo o tempo de parede em ms e o nº de checagens de restrição. */
function medir(fn: () => void): { tempoMs: number; checagens: number } {
  contador.reset();
  const inicio = process.hrtime.bigint();
  fn();
  const fim = process.hrtime.bigint();
  return { tempoMs: Number(fim - inicio) / 1e6, checagens: contador.checagens };
}

function mediana(valores: number[]): number {
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  if (ordenado.length % 2 === 1) return ordenado[meio]!;
  return (ordenado[meio - 1]! + ordenado[meio]!) / 2;
}

const OBS_ABORTO = 'abortado no teto (valores parciais)';

// ---------------------------------------------------------------------------
// Execução de um par (regime, d)
// ---------------------------------------------------------------------------

/** Medição do forward checking — console apenas, fora do CSV e das tabelas. */
interface LinhaFc {
  regime: Regime;
  d: number;
  checagens: number;
  tempoMsMediano: number;
  consistente: boolean;
}

/**
 * Comparação AC-3 (arco-consistência completa) × 1 passada de forward
 * checking, por categoria — console apenas (Prompt 4). Só existe para o
 * regime `selecao_parcial` (há variável fixada).
 */
interface LinhaFiltragemFc {
  d: number;
  ac3TamanhosPorCategoria: Record<string, number>;
  ac3Residual: number;
  fcTamanhosPorCategoria: Record<string, number>;
  fcResidual: number;
}

interface ResultadoPar {
  linhaAc3: LinhaBenchmark;
  linhaFb: LinhaBenchmark;
  ac3Consistente: boolean;
  ac3Residual: number;
  ramPodada: boolean; // domínio da RAM ficou < d após a poda?
  fbValidas: number;
  fbConcluido: boolean;
  cpuFixadaLabel?: string; // só no regime selecao_parcial
  // --- Forward checking (terceiro motor) ---
  // Fica FORA de LinhaBenchmark de propósito: `tables.ts` trata qualquer motor
  // != 'ac3' como força bruta ao indexar, então uma linha 'fc' sobrescreveria a
  // FB nas tabelas .tex. O FC é reportado só no console.
  fcChecagens: number;
  fcTempoMs: number;
  fcConsistente: boolean;
  // --- Decomposição completa do AC-3 e filtragem de 1 passada (Prompt 4) ---
  // `filtragemFc` também fica FORA de LinhaBenchmark pelo mesmo motivo do FC
  // acima — não é um `motor` de LinhaBenchmark, só uma comparação console.
  ac3TamanhosPorCategoria: Record<string, number>;
  filtragemFc?: ResultadoFiltragemFc; // só no regime selecao_parcial
}

function rodarPar(regime: Regime, d: number): ResultadoPar {
  const combinacoesTotais = BigInt(d) ** 5n;
  const cenario = gerarCenario(d, CONFIG.seed);

  // Prepara domínios conforme o regime.
  let variaveis = cenario.variaveis;
  let dominios = cenario.dominios;
  let cpuFixadaLabel: string | undefined;
  if (regime === 'selecao_parcial') {
    const sel = aplicarSelecaoParcialCpu(cenario);
    variaveis = sel.variaveis;
    dominios = sel.dominios;
    const socket = sel.cpuFixada.caracteristicas.find((c) => c.nome === 'socket')?.valor ?? '?';
    cpuFixadaLabel = `${sel.cpuFixada.id} (socket ${socket})`;
  }

  // --- AC-3 ---
  const ac3Tempos: number[] = [];
  const ac3Checagens: number[] = [];
  let ac3Residual = 0;
  let ramTamanho = d;
  let ac3TamanhosPorCategoria: Record<string, number> = {};
  for (let i = 0; i < CONFIG.runs; i++) {
    let res!: ReturnType<typeof rodarAc3>;
    const m = medir(() => {
      res = rodarAc3(variaveis, cenario.restricoes);
    });
    ac3Tempos.push(m.tempoMs);
    ac3Checagens.push(m.checagens);
    ac3Residual = res.espacoResidual;
    ramTamanho = res.tamanhosPorCategoria[CAT.RAM] ?? d;
    ac3TamanhosPorCategoria = res.tamanhosPorCategoria;
  }

  // --- Força bruta ---
  const fbTempos: number[] = [];
  const fbChecagens: number[] = [];
  const fbValidas: number[] = [];
  let fbConcluido = true;
  for (let i = 0; i < CONFIG.runs; i++) {
    let res!: ReturnType<typeof forcaBruta>;
    const m = medir(() => {
      res = forcaBruta(dominios, cenario.restricoes, {
        maxMs: CONFIG.maxMs,
        maxCombos: CONFIG.maxCombos,
      });
    });
    fbTempos.push(m.tempoMs);
    fbChecagens.push(m.checagens);
    fbValidas.push(res.validas);
    fbConcluido = res.concluido;
  }
  const fbValidasMed = Math.round(mediana(fbValidas));

  // --- Forward checking ---
  // Recebe as MESMAS `variaveis` do AC-3 (já ajustadas ao regime); clona
  // internamente, então não muta o cenário compartilhado com os outros motores.
  const fcTempos: number[] = [];
  const fcChecagens: number[] = [];
  let fcConsistente = false;
  for (let i = 0; i < CONFIG.runs; i++) {
    let res!: ReturnType<typeof rodarForwardChecking>;
    const m = medir(() => {
      res = rodarForwardChecking(variaveis, cenario.restricoes);
    });
    fcTempos.push(m.tempoMs);
    fcChecagens.push(m.checagens);
    fcConsistente = res.consistente;
  }

  // --- Filtragem de forward checking em 1 passada (Prompt 4) ---
  // Só se aplica quando há variável fixada (regime de seleção parcial); mede
  // o efeito de UM nível de propagação a partir dela, para comparar com a
  // poda completa do AC-3 (tamanhosPorCategoria acima).
  let filtragemFc: ResultadoFiltragemFc | undefined;
  if (regime === 'selecao_parcial') {
    filtragemFc = filtrarForwardChecking(variaveis, cenario.restricoes);
  }

  const linhaAc3: LinhaBenchmark = {
    regime,
    d,
    motor: 'ac3',
    combinacoesTotaisTeoricas: combinacoesTotais,
    checagens: Math.round(mediana(ac3Checagens)),
    tempoMsMediano: mediana(ac3Tempos),
    espacoResidual: ac3Residual,
    configuracoesValidas: null, // AC-3 não enumera soluções (ver ac3-runner.ts)
    concluido: true,
    observacao: '',
  };

  const linhaFb: LinhaBenchmark = {
    regime,
    d,
    motor: 'forca_bruta',
    combinacoesTotaisTeoricas: combinacoesTotais,
    checagens: Math.round(mediana(fbChecagens)),
    tempoMsMediano: mediana(fbTempos),
    espacoResidual: null, // NA para força bruta
    configuracoesValidas: fbValidasMed,
    concluido: fbConcluido,
    observacao: fbConcluido ? '' : OBS_ABORTO,
  };

  return {
    linhaAc3,
    linhaFb,
    ac3Consistente: ac3Residual > 0,
    ac3Residual,
    ramPodada: ramTamanho < d,
    fbValidas: fbValidasMed,
    fbConcluido,
    cpuFixadaLabel,
    fcChecagens: Math.round(mediana(fcChecagens)),
    fcTempoMs: mediana(fcTempos),
    fcConsistente,
    ac3TamanhosPorCategoria,
    filtragemFc,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log('==================================================================');
  console.log(' BENCHMARK AC-3 × Força Bruta — 2 regimes  (baseline experimental — TCC)');
  console.log('==================================================================');
  console.log(
    `  d = [${CONFIG.ds.join(', ')}] | runs = ${CONFIG.runs} | ` +
      `teto = ${CONFIG.maxMs}ms ou ${CONFIG.maxCombos.toExponential(0)} combos | seed = ${CONFIG.seed}`,
  );

  const linhas: LinhaBenchmark[] = [];
  // Medições do FC, mantidas à parte de `linhas` (não entram no CSV nem nas
  // tabelas .tex — ver comentário em ResultadoPar).
  const fcLinhas: LinhaFc[] = [];
  // Decomposição AC-3 × FC-1-passada (Prompt 4) — console apenas.
  const filtragemLinhas: LinhaFiltragemFc[] = [];
  let sanidadeOk = true;

  instalarContador();
  try {
    for (const regime of REGIMES) {
      console.log('------------------------------------------------------------------');
      console.log(`REGIME: ${regime}`);
      for (const d of CONFIG.ds) {
        const par = rodarPar(regime, d);
        linhas.push(par.linhaAc3, par.linhaFb);
        fcLinhas.push({
          regime,
          d,
          checagens: par.fcChecagens,
          tempoMsMediano: par.fcTempoMs,
          consistente: par.fcConsistente,
        });
        if (par.filtragemFc) {
          filtragemLinhas.push({
            d,
            ac3TamanhosPorCategoria: par.ac3TamanhosPorCategoria,
            ac3Residual: par.ac3Residual,
            fcTamanhosPorCategoria: par.filtragemFc.tamanhosPorCategoria,
            fcResidual: par.filtragemFc.espacoResidual,
          });
        }

        if (par.cpuFixadaLabel && d === CONFIG.ds[0]) {
          console.log(`  CPU fixada (seleção parcial): ${par.cpuFixadaLabel}`);
        }

        // --- Sanidade por regime ---
        const dPot5 = Number(par.linhaAc3.combinacoesTotaisTeoricas);
        let nota = '';
        if (regime === 'irrestrito') {
          const semPoda = par.ac3Residual === dPot5;
          sanidadeOk &&= semPoda;
          nota = semPoda ? '✓ residual==d⁵' : '✗ ESPERADO residual==d⁵';
        } else {
          const podou = par.ac3Residual < dPot5 && par.ramPodada;
          sanidadeOk &&= podou;
          if (podou) {
            nota = `✓ residual<d⁵ e RAM podada`;
          } else {
            nota = `✗ SEM PODA (residual=${par.ac3Residual}, d⁵=${dPot5}, RAM podada=${par.ramPodada})`;
          }
          // Limite superior: quando a FB conclui, validas ≤ residual.
          if (par.fbConcluido) {
            const ok = par.fbValidas <= par.ac3Residual;
            sanidadeOk &&= ok;
            nota += ok
              ? ` | ✓ validas(${par.fbValidas})≤residual`
              : ` | ✗ validas(${par.fbValidas})>residual(${par.ac3Residual})`;
          }
        }

        console.log(
          `  d=${String(d).padStart(4)}  ` +
            `AC-3: ${par.linhaAc3.tempoMsMediano.toFixed(3)}ms / ${par.linhaAc3.checagens} chk  |  ` +
            `FC: ${par.fcTempoMs.toFixed(3)}ms / ${par.fcChecagens} chk  |  ` +
            `FB: ${par.linhaFb.tempoMsMediano.toFixed(1)}ms / ${par.linhaFb.checagens} chk` +
            `${par.fbConcluido ? '' : ' (teto)'}  |  ${nota}`,
        );
      }
    }
  } finally {
    restaurar();
  }

  const outDir = path.join(__dirname, 'output');
  escreverCsv(linhas, outDir);
  gerarTabelas(linhas, outDir, CONFIG.tabD);
  console.log('------------------------------------------------------------------');
  console.log(`Tabelas LaTeX geradas: tabela_regime1.tex, tabela_regime2.tex, tabela_comparativa.tex (d=${CONFIG.tabD})`);
  imprimirResumo(linhas);
  imprimirResumoTresMotores(linhas, fcLinhas);
  if (filtragemLinhas.length > 0) {
    imprimirComparacaoFiltragem(filtragemLinhas);
  }
  console.log(
    `\nSanidade global: ${sanidadeOk ? '✓ TODAS as verificações passaram' : '✗ ALGUMA verificação falhou (ver acima)'}`,
  );
}

// ---------------------------------------------------------------------------
// Saída
// ---------------------------------------------------------------------------

function escreverCsv(linhas: LinhaBenchmark[], outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  const arquivo = path.join(outDir, 'benchmark.csv');

  const cabecalho =
    'regime,d,motor,combinacoes_totais_teoricas,checagens_avaliadas,tempo_ms_mediano,espaco_residual,configuracoes_validas,concluido,observacao';
  const corpo = linhas
    .map((l) =>
      [
        l.regime,
        l.d,
        l.motor,
        l.combinacoesTotaisTeoricas.toString(),
        l.checagens,
        l.tempoMsMediano.toFixed(4),
        l.espacoResidual ?? '',
        l.configuracoesValidas ?? '',
        l.concluido,
        l.observacao,
      ].join(','),
    )
    .join('\n');

  fs.writeFileSync(arquivo, `${cabecalho}\n${corpo}\n`, 'utf8');
  console.log('------------------------------------------------------------------');
  console.log(`CSV salvo em: ${arquivo}`);
}

function imprimirResumo(linhas: LinhaBenchmark[]): void {
  console.log('\n=== RESUMO (mediana) ===');
  const col = (s: string | number, n: number) => String(s).padStart(n);
  console.log(
    [
      col('regime', 16),
      col('d', 5),
      col('motor', 12),
      col('checagens', 14),
      col('tempo_ms', 12),
      col('residual', 16),
      col('validas', 12),
      col('concl.', 7),
    ].join(' '),
  );
  for (const l of linhas) {
    console.log(
      [
        col(l.regime, 16),
        col(l.d, 5),
        col(l.motor, 12),
        col(l.checagens, 14),
        col(l.tempoMsMediano.toFixed(3), 12),
        col(l.espacoResidual ?? '—', 16),
        col(l.configuracoesValidas ?? '—', 12),
        col(String(l.concluido), 7),
      ].join(' '),
    );
  }
  console.log(
    '\nNota: "residual" (AC-3) é o produto dos domínios após a poda — limite superior\n' +
      'do nº de soluções, não a contagem exata (essa é "validas", da força bruta quando\n' +
      'conclui). combinacoes_totais_teoricas = d⁵ é a curva que a FB seguiria sem teto.',
  );
}

/**
 * Tabela crua dos TRÊS motores lado a lado (checagens e tempo), por regime e d.
 * Só console: o FC não entra no CSV nem nas tabelas .tex.
 */
function imprimirResumoTresMotores(linhas: LinhaBenchmark[], fcLinhas: LinhaFc[]): void {
  console.log('\n=== TRÊS MOTORES (mediana) — AC-3 × Forward Checking × Força Bruta ===');
  const col = (s: string | number, n: number) => String(s).padStart(n);

  const buscar = (regime: Regime, d: number, motor: LinhaBenchmark['motor']) =>
    linhas.find((l) => l.regime === regime && l.d === d && l.motor === motor);

  console.log(
    [
      col('regime', 16),
      col('d', 5),
      col('AC3 chk', 12),
      col('FC chk', 10),
      col('FB chk', 14),
      col('AC3 ms', 10),
      col('FC ms', 10),
      col('FB ms', 11),
      col('FB concl.', 10),
    ].join(' '),
  );

  for (const fc of fcLinhas) {
    const ac3 = buscar(fc.regime, fc.d, 'ac3');
    const fb = buscar(fc.regime, fc.d, 'forca_bruta');
    console.log(
      [
        col(fc.regime, 16),
        col(fc.d, 5),
        col(ac3?.checagens ?? '—', 12),
        col(fc.checagens, 10),
        col(fb?.checagens ?? '—', 14),
        col((ac3?.tempoMsMediano ?? 0).toFixed(3), 10),
        col(fc.tempoMsMediano.toFixed(3), 10),
        col((fb?.tempoMsMediano ?? 0).toFixed(3), 11),
        col(String(fb?.concluido ?? '—'), 10),
      ].join(' '),
    );
  }

  const todosConsistentes = fcLinhas.every((l) => l.consistente);
  console.log(
    `\nFC encontrou atribuição completa consistente em todos os (regime, d): ${todosConsistentes ? 'sim' : 'NÃO'}`,
  );
}

const ROTULO_CATEGORIA: Record<string, string> = {
  [CAT.CPU]: 'CPU',
  [CAT.PLACA]: 'Placa',
  [CAT.RAM]: 'RAM',
  [CAT.GPU]: 'GPU',
  [CAT.FONTE]: 'Fonte',
};

/**
 * Decomposição por categoria: AC-3 (arco-consistência completa) × 1 passada
 * de forward checking a partir da variável fixada — Prompt 4. Só regime
 * `selecao_parcial`. Console apenas; não entra no CSV nem nas tabelas .tex.
 */
function imprimirComparacaoFiltragem(linhas: LinhaFiltragemFc[]): void {
  console.log(
    '\n=== PODER DE FILTRAGEM: AC-3 (arco-consistência completa) × Forward Checking (1 passada) ===',
  );
  const col = (s: string | number, n: number) => String(s).padStart(n);

  for (const l of linhas) {
    console.log(`\n  d=${l.d}`);
    console.log([col('categoria', 10), col('AC-3', 10), col('FC (1 passada)', 16)].join(' '));
    for (const categoriaId of CATEGORIAS_ORDENADAS) {
      console.log(
        [
          col(ROTULO_CATEGORIA[categoriaId] ?? categoriaId, 10),
          col(l.ac3TamanhosPorCategoria[categoriaId] ?? '—', 10),
          col(l.fcTamanhosPorCategoria[categoriaId] ?? '—', 16),
        ].join(' '),
      );
    }
    const razao = l.fcResidual / l.ac3Residual;
    console.log(
      `  residual AC-3=${l.ac3Residual}  |  residual FC(1 passada)=${l.fcResidual}  |  ` +
        `razão FC/AC-3=${razao.toFixed(4)}`,
    );
  }
}

main();
