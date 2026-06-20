/**
 * Testes unitários do motor AC-3.
 *
 * Cobrem os 3 cenários mínimos do TCC:
 *   1) poda de valores sem suporte na variável vizinha (RF-05);
 *   2) detecção de inconsistência quando um domínio fica vazio (Seção 2.6);
 *   3) determinismo de execução (RNF-10).
 *
 * Fixtures são construídos manualmente com o modelo genérico EAV,
 * sem Prisma — `ac3()` é uma função pura.
 */

import { ac3 } from './ac3';
import type { RestricaoInterna, VariavelCSP } from './types';
import type { Componente } from '@hardware-csp/shared-types';

// ---------------------------------------------------------------------------
// IDs de teste (categorias e características fictícias)
// ---------------------------------------------------------------------------

const CAT_CPU = 'cat-cpu';
const CAT_PLACA = 'cat-placa';
const CAR_SOCKET_CPU = 'car-socket-cpu';       // caracteristica socket da CPU
const CAR_SOCKET_PLACA = 'car-socket-placa';   // caracteristica socketSuportado da Placa

// ---------------------------------------------------------------------------
// Helpers de fixture
// ---------------------------------------------------------------------------

function mkCpu(id: string, socket: string): Componente {
  return {
    id,
    nome: `CPU-${id}`,
    marcaNome: 'TestBrand',
    categoriaId: CAT_CPU,
    caracteristicas: [
      { caracteristicaId: CAR_SOCKET_CPU, nome: 'socket', tipo: 'TEXTO', valor: socket },
    ],
  };
}

function mkPlaca(id: string, socketSuportado: string): Componente {
  return {
    id,
    nome: `Placa-${id}`,
    marcaNome: 'TestBrand',
    categoriaId: CAT_PLACA,
    caracteristicas: [
      { caracteristicaId: CAR_SOCKET_PLACA, nome: 'socketSuportado', tipo: 'TEXTO', valor: socketSuportado },
    ],
  };
}

function mkVar(categoriaId: string, componentes: Componente[]): VariavelCSP {
  const dominio = new Map<string, Componente>();
  for (const c of componentes) dominio.set(c.id, c);
  return { categoriaId, dominio };
}

function clonarVariaveis(vars: VariavelCSP[]): VariavelCSP[] {
  return vars.map((v) => ({
    categoriaId: v.categoriaId,
    dominio: new Map(v.dominio),
  }));
}

const RESTRICAO_SOCKET: RestricaoInterna = {
  id: 'r-socket',
  variavelDemanda: CAT_CPU,
  variavelCapacidade: CAT_PLACA,
  caracteristica1Id: CAR_SOCKET_CPU,
  caracteristica2Id: CAR_SOCKET_PLACA,
  operador: 'IGUAL',
  templateJustificativa: '{comp2.nome} utiliza soquete {val2}, incompatível com {comp1.nome}, que exige soquete {val1}.',
};

// ---------------------------------------------------------------------------
// Casos de teste
// ---------------------------------------------------------------------------

describe('AC-3', () => {
  it('remove valor sem suporte na variável vizinha', () => {
    const cpus = [mkCpu('cpu-am4', 'AM4'), mkCpu('cpu-am5', 'AM5')];
    const placas = [mkPlaca('placa-am5', 'AM5')];
    const variaveis = [mkVar(CAT_CPU, cpus), mkVar(CAT_PLACA, placas)];

    const resultado = ac3(variaveis, [RESTRICAO_SOCKET]);

    expect(resultado.consistente).toBe(true);

    const dominioCpu = resultado.variaveis.find((v) => v.categoriaId === CAT_CPU)!.dominio;
    expect(Array.from(dominioCpu.keys())).toEqual(['cpu-am5']);

    const cpusRemovidas = resultado.removidos
      .filter((r) => r.categoriaId === CAT_CPU)
      .map((r) => r.componenteId);
    expect(cpusRemovidas).toContain('cpu-am4');
  });

  it('retorna consistente=false quando um domínio fica vazio', () => {
    const cpus = [mkCpu('cpu-am4', 'AM4')];
    const placas = [mkPlaca('placa-am5', 'AM5')];
    const variaveis = [mkVar(CAT_CPU, cpus), mkVar(CAT_PLACA, placas)];

    const resultado = ac3(variaveis, [RESTRICAO_SOCKET]);

    expect(resultado.consistente).toBe(false);
  });

  it('é determinístico (mesma entrada → mesma saída em 10 execuções)', () => {
    const cpusBase = [
      mkCpu('cpu-am4-a', 'AM4'),
      mkCpu('cpu-am4-b', 'AM4'),
      mkCpu('cpu-am5-a', 'AM5'),
    ];
    const placasBase = [
      mkPlaca('placa-am5-a', 'AM5'),
      mkPlaca('placa-am5-b', 'AM5'),
    ];
    const variaveisBase = [mkVar(CAT_CPU, cpusBase), mkVar(CAT_PLACA, placasBase)];

    const serializar = (vars: VariavelCSP[], removidos: { componenteId: string }[]) => {
      const dominios = vars
        .map((v) => `${v.categoriaId}:[${Array.from(v.dominio.keys()).sort().join(',')}]`)
        .sort()
        .join('|');
      const ids = removidos.map((r) => r.componenteId).sort().join(',');
      return `${dominios}::${ids}`;
    };

    const assinaturas = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const r = ac3(clonarVariaveis(variaveisBase), [RESTRICAO_SOCKET]);
      assinaturas.add(`${r.consistente}|${serializar(r.variaveis, r.removidos)}`);
    }

    expect(assinaturas.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Testes adicionais: MAIOR_OU_IGUAL e três conflitos canônicos
// ---------------------------------------------------------------------------

const CAT_GPU   = 'cat-gpu';
const CAT_FONTE = 'cat-fonte';
const CAT_RAM   = 'cat-ram';
const CAR_TDP       = 'car-tdp';
const CAR_POTENCIA  = 'car-potencia';
const CAR_PADRAO_RAM   = 'car-padrao-ram';
const CAR_PADRAO_PLACA = 'car-padrao-placa';

function mkGpu(id: string, tdp: string): Componente {
  return {
    id, nome: `GPU-${id}`, marcaNome: 'Test', categoriaId: CAT_GPU,
    caracteristicas: [{ caracteristicaId: CAR_TDP, nome: 'tdp', tipo: 'INTEIRO', valor: tdp }],
  };
}
function mkFonte(id: string, potencia: string): Componente {
  return {
    id, nome: `Fonte-${id}`, marcaNome: 'Test', categoriaId: CAT_FONTE,
    caracteristicas: [{ caracteristicaId: CAR_POTENCIA, nome: 'potencia', tipo: 'INTEIRO', valor: potencia }],
  };
}
function mkRam(id: string, padrao: string): Componente {
  return {
    id, nome: `RAM-${id}`, marcaNome: 'Test', categoriaId: CAT_RAM,
    caracteristicas: [{ caracteristicaId: CAR_PADRAO_RAM, nome: 'padrao', tipo: 'TEXTO', valor: padrao }],
  };
}
function mkPlacaMem(id: string, padrao: string): Componente {
  return {
    id, nome: `Placa-${id}`, marcaNome: 'Test', categoriaId: CAT_PLACA,
    caracteristicas: [{ caracteristicaId: CAR_PADRAO_PLACA, nome: 'padraoMemoria', tipo: 'TEXTO', valor: padrao }],
  };
}

const RESTRICAO_TDP: RestricaoInterna = {
  id: 'r-tdp',
  variavelDemanda: CAT_GPU,
  variavelCapacidade: CAT_FONTE,
  caracteristica1Id: CAR_TDP,
  caracteristica2Id: CAR_POTENCIA,
  operador: 'MAIOR_OU_IGUAL',
  parametro: '1.25',
  templateJustificativa:
    '{comp2.nome} fornece {val2}W, insuficiente para {comp1.nome} (mínimo {val1_com_margem}W).',
};

describe('MAIOR_OU_IGUAL — convenção variavelDemanda/variavelCapacidade', () => {
  it('GPU 315W (demanda) + Fonte 250W (capacidade) → inconsistente (250 < 315 × 1,25 = 393,75)', () => {
    const vars = [mkVar(CAT_GPU, [mkGpu('rx7900', '315')]), mkVar(CAT_FONTE, [mkFonte('cv250', '250')])];
    const r = ac3(vars, [RESTRICAO_TDP]);
    expect(r.consistente).toBe(false);
  });

  it('GPU 130W (demanda) + Fonte 250W (capacidade) → compatível (250 >= 130 × 1,25 = 162,5)', () => {
    const vars = [mkVar(CAT_GPU, [mkGpu('rx6600', '130')]), mkVar(CAT_FONTE, [mkFonte('cv250', '250')])];
    const r = ac3(vars, [RESTRICAO_TDP]);
    expect(r.consistente).toBe(true);
    expect(r.removidos).toHaveLength(0);
  });

  it('LIMITAÇÃO CONHECIDA: convenção demanda/capacidade não é validada em runtime — cadastrar MAIOR_OU_IGUAL com lados trocados produz falso-positivo. A renomeação dos campos é salvaguarda de LEGIBILIDADE, não estrutural.', () => {
    // GPU 315W TDP e Fonte 250W são fisicamente incompatíveis (250 < 393,75W),
    // mas com variavelDemanda/variavelCapacidade trocados no cadastro o avaliador
    // verifica 315 (TDP) >= 250 (potência) × 1,25 = 312,5 → true.
    // Resultado: falso-positivo — o sistema reporta "compatível" incorretamente.
    // Validação estrutural em runtime fica como trabalho futuro.
    const restricaoInvertida: RestricaoInterna = {
      id: 'r-tdp-invertido',
      variavelDemanda: CAT_FONTE,    // ERRADO: Fonte não é demanda
      variavelCapacidade: CAT_GPU,   // ERRADO: GPU não é capacidade
      caracteristica1Id: CAR_POTENCIA, // val1 = 250 W (papel trocado)
      caracteristica2Id: CAR_TDP,      // val2 = 315 W (papel trocado)
      operador: 'MAIOR_OU_IGUAL',
      parametro: '1.25',
      templateJustificativa: 'template',
    };
    const vars = [mkVar(CAT_GPU, [mkGpu('rx7900', '315')]), mkVar(CAT_FONTE, [mkFonte('cv250', '250')])];
    const r = ac3(vars, [restricaoInvertida]);
    // 315 >= 250 × 1,25 = 312,5 → true → falso-positivo (limitação conhecida)
    expect(r.consistente).toBe(true);
  });
});

describe('Três conflitos canônicos (regressão)', () => {
  it('socket: CPU AM4 + Placa AM5 única → inconsistente', () => {
    const vars = [mkVar(CAT_CPU, [mkCpu('am4', 'AM4')]), mkVar(CAT_PLACA, [mkPlaca('am5', 'AM5')])];
    const r = ac3(vars, [RESTRICAO_SOCKET]);
    expect(r.consistente).toBe(false);
  });

  it('memória: RAM DDR4 + Placa DDR5 única → inconsistente', () => {
    const restricaoMem: RestricaoInterna = {
      id: 'r-mem',
      variavelDemanda: CAT_RAM,
      variavelCapacidade: CAT_PLACA,
      caracteristica1Id: CAR_PADRAO_RAM,
      caracteristica2Id: CAR_PADRAO_PLACA,
      operador: 'IGUAL',
      templateJustificativa: 'template',
    };
    const vars = [mkVar(CAT_RAM, [mkRam('ddr4', 'DDR4')]), mkVar(CAT_PLACA, [mkPlacaMem('ddr5', 'DDR5')])];
    const r = ac3(vars, [restricaoMem]);
    expect(r.consistente).toBe(false);
  });

  it('TDP: GPU 315W + Fonte 250W → inconsistente', () => {
    const vars = [mkVar(CAT_GPU, [mkGpu('rx7900', '315')]), mkVar(CAT_FONTE, [mkFonte('cv250', '250')])];
    const r = ac3(vars, [RESTRICAO_TDP]);
    expect(r.consistente).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Regressão: múltiplas incompatibilidades simultâneas sem ghost blocks
// ---------------------------------------------------------------------------

describe('Múltiplas incompatibilidades simultâneas — sem ghost blocks', () => {
  // IDs próprios para não colidir com fixtures dos outros describes
  const M_CPU   = 'm-cpu';
  const M_PLACA = 'm-placa';
  const M_RAM   = 'm-ram';
  const M_GPU   = 'm-gpu';
  const M_FONTE = 'm-fonte';
  const M_CAR_SOCKET_CPU   = 'm-car-socket-cpu';
  const M_CAR_SOCKET_PLACA = 'm-car-socket-placa';
  const M_CAR_PADRAO_RAM   = 'm-car-padrao-ram';
  const M_CAR_PADRAO_PLACA = 'm-car-padrao-placa';
  const M_CAR_TDP          = 'm-car-tdp';
  const M_CAR_POTENCIA     = 'm-car-potencia';

  // Fixtures colapsados: 1 componente por domínio (simulando todos selecionados)
  const cpuAm5: Componente = {
    id: 'cpu-am5', nome: 'CPU-AM5', marcaNome: 'T', categoriaId: M_CPU,
    caracteristicas: [{ caracteristicaId: M_CAR_SOCKET_CPU, nome: 'socket', tipo: 'TEXTO', valor: 'AM5' }],
  };
  const placaAm4Ddr4: Componente = {
    id: 'placa-am4-ddr4', nome: 'Placa-AM4-DDR4', marcaNome: 'T', categoriaId: M_PLACA,
    caracteristicas: [
      { caracteristicaId: M_CAR_SOCKET_PLACA, nome: 'socketSuportado', tipo: 'TEXTO', valor: 'AM4' },
      { caracteristicaId: M_CAR_PADRAO_PLACA, nome: 'padraoMemoria',   tipo: 'TEXTO', valor: 'DDR4' },
    ],
  };
  const ramDdr5: Componente = {
    id: 'ram-ddr5', nome: 'RAM-DDR5', marcaNome: 'T', categoriaId: M_RAM,
    caracteristicas: [{ caracteristicaId: M_CAR_PADRAO_RAM, nome: 'padrao', tipo: 'TEXTO', valor: 'DDR5' }],
  };
  const gpu315: Componente = {
    id: 'gpu-315', nome: 'GPU-315', marcaNome: 'T', categoriaId: M_GPU,
    caracteristicas: [{ caracteristicaId: M_CAR_TDP, nome: 'tdp', tipo: 'INTEIRO', valor: '315' }],
  };
  const fonte250: Componente = {
    id: 'fonte-250', nome: 'Fonte-250', marcaNome: 'T', categoriaId: M_FONTE,
    caracteristicas: [{ caracteristicaId: M_CAR_POTENCIA, nome: 'potencia', tipo: 'INTEIRO', valor: '250' }],
  };

  const restricaoSocket: RestricaoInterna = {
    id: 'r-socket-m', variavelDemanda: M_CPU, variavelCapacidade: M_PLACA,
    caracteristica1Id: M_CAR_SOCKET_CPU, caracteristica2Id: M_CAR_SOCKET_PLACA,
    operador: 'IGUAL', templateJustificativa: 'template',
  };
  const restricaoMem: RestricaoInterna = {
    id: 'r-mem-m', variavelDemanda: M_RAM, variavelCapacidade: M_PLACA,
    caracteristica1Id: M_CAR_PADRAO_RAM, caracteristica2Id: M_CAR_PADRAO_PLACA,
    operador: 'IGUAL', templateJustificativa: 'template',
  };
  const restricaoTdp: RestricaoInterna = {
    id: 'r-tdp-m', variavelDemanda: M_GPU, variavelCapacidade: M_FONTE,
    caracteristica1Id: M_CAR_TDP, caracteristica2Id: M_CAR_POTENCIA,
    operador: 'MAIOR_OU_IGUAL', parametro: '1.25', templateJustificativa: 'template',
  };

  it('detecta socket + memória + TDP sem cascata fantasma', () => {
    const variaveis = [
      mkVar(M_CPU,   [cpuAm5]),
      mkVar(M_PLACA, [placaAm4Ddr4]),
      mkVar(M_RAM,   [ramDdr5]),
      mkVar(M_GPU,   [gpu315]),
      mkVar(M_FONTE, [fonte250]),
    ];

    const r = ac3(variaveis, [restricaoSocket, restricaoMem, restricaoTdp]);

    // Inconsistente: CPU, RAM e GPU ficam com domínio vazio
    expect(r.consistente).toBe(false);

    // Exatamente 3 remoções REAIS (cpu-am5, ram-ddr5, gpu-315)
    // Placa e Fonte NÃO devem aparecer (sem ghost blocks)
    const removidosIds = r.removidos.map((rem) => rem.componenteId).sort();
    expect(removidosIds).toEqual(['cpu-am5', 'gpu-315', 'ram-ddr5'].sort());

    // Todas as âncoras estão definidas (ghost blocks teriam ancora=undefined)
    for (const rem of r.removidos) {
      expect(rem.ancora).toBeDefined();
    }

    // Placa e Fonte continuam nos seus domínios (não foram cascata-fantasma)
    const dominioPlaca = r.variaveis.find((v) => v.categoriaId === M_PLACA)!.dominio;
    const dominioFonte = r.variaveis.find((v) => v.categoriaId === M_FONTE)!.dominio;
    expect(dominioPlaca.has('placa-am4-ddr4')).toBe(true);
    expect(dominioFonte.has('fonte-250')).toBe(true);
  });
});
