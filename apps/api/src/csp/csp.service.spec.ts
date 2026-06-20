/**
 * Testes de integração do CspService (camada de orquestração).
 *
 * Estratégia: real CspService + real ExplanationsService; PrismaService e
 * ComponentsService mockados com jest.fn().
 *
 * Cobre o cenário canônico do TCC: 5 componentes totalmente incompatíveis,
 * verificando que a complementação simétrica produz as justificativas corretas
 * para TODAS as categorias, incluindo a Placa que viola 2 restrições (RF-05,
 * RF-10, RNF-14).
 *
 * Shape real que os mocks espelham
 * ─────────────────────────────────
 * carregarRestricoes() faz:
 *   prisma.restricao.findMany({
 *     include: {
 *       caracteristica1: { select: { categoriaId: true } },
 *       caracteristica2: { select: { categoriaId: true } },
 *     },
 *   })
 * e lê: linha.id, linha.caracteristica1Id, linha.caracteristica2Id,
 *        linha.operador, linha.parametro, linha.templateJustificativa,
 *        linha.caracteristica1.categoriaId, linha.caracteristica2.categoriaId.
 *
 * carregarVariaveis() faz:
 *   prisma.categoria.findMany({ orderBy: { ordem: 'asc' } })
 * e lê: cat.id, cat.ordem.
 * Para cada categoria com idAtribuido no estado:
 *   components.buscarPorId(idAtribuido) → Componente | null
 * Para categorias sem seleção:
 *   components.listarPorCategoriaId(cat.id) → Componente[]
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CspService } from './csp.service';
import { ExplanationsService } from '../explanations/explanations.service';
import { PrismaService } from '../prisma/prisma.service';
import { ComponentsService } from '../components/components.service';
import type { Componente, EstadoConfiguracao } from '@hardware-csp/shared-types';

// ---------------------------------------------------------------------------
// IDs fixos (simulam UUIDs gerados pelo banco)
// ---------------------------------------------------------------------------

const CAT_CPU   = 'cat-cpu-id';
const CAT_PLACA = 'cat-placa-id';
const CAT_RAM   = 'cat-ram-id';
const CAT_GPU   = 'cat-gpu-id';
const CAT_FONTE = 'cat-fonte-id';

const CAR_SOCKET_CPU   = 'car-socket-cpu-id';
const CAR_SOCKET_PLACA = 'car-socket-placa-id';
const CAR_PADRAO_RAM   = 'car-padrao-ram-id';
const CAR_PADRAO_PLACA = 'car-padrao-placa-id';
const CAR_TDP_GPU      = 'car-tdp-gpu-id';
const CAR_POTENCIA     = 'car-potencia-fonte-id';

const ID_CPU   = 'ryzen-5-7600-id';
const ID_PLACA = 'prime-b550m-a-id';
const ID_RAM   = 'fury-beast-ddr5-id';
const ID_GPU   = 'rx-7900-xt-id';
const ID_FONTE = 'cv250-id';

// ---------------------------------------------------------------------------
// Componentes (estrutura Componente de @hardware-csp/shared-types)
// ---------------------------------------------------------------------------

const CPU: Componente = {
  id: ID_CPU, nome: 'Ryzen 5 7600', marcaNome: 'AMD', categoriaId: CAT_CPU,
  caracteristicas: [
    { caracteristicaId: CAR_SOCKET_CPU, nome: 'socket', tipo: 'TEXTO', valor: 'AM5' },
  ],
};

const PLACA: Componente = {
  id: ID_PLACA, nome: 'PRIME B550M-A', marcaNome: 'ASUS', categoriaId: CAT_PLACA,
  caracteristicas: [
    { caracteristicaId: CAR_SOCKET_PLACA, nome: 'socketSuportado', tipo: 'TEXTO', valor: 'AM4' },
    { caracteristicaId: CAR_PADRAO_PLACA, nome: 'padraoMemoria',   tipo: 'TEXTO', valor: 'DDR4' },
  ],
};

const RAM: Componente = {
  id: ID_RAM, nome: 'Fury Beast DDR5', marcaNome: 'Kingston', categoriaId: CAT_RAM,
  caracteristicas: [
    { caracteristicaId: CAR_PADRAO_RAM, nome: 'padrao', tipo: 'TEXTO', valor: 'DDR5' },
  ],
};

const GPU: Componente = {
  id: ID_GPU, nome: 'RX 7900 XT', marcaNome: 'AMD', categoriaId: CAT_GPU,
  caracteristicas: [
    { caracteristicaId: CAR_TDP_GPU, nome: 'tdp', tipo: 'INTEIRO', valor: '315' },
  ],
};

const FONTE: Componente = {
  id: ID_FONTE, nome: 'CV250', marcaNome: 'Corsair', categoriaId: CAT_FONTE,
  caracteristicas: [
    { caracteristicaId: CAR_POTENCIA, nome: 'potencia', tipo: 'INTEIRO', valor: '250' },
  ],
};

// ---------------------------------------------------------------------------
// Restrições no shape exato que Prisma retorna com include (veja comentário do
// arquivo): nested caracteristica1/2 com apenas { categoriaId }.
// ---------------------------------------------------------------------------

const RESTRICOES_MOCK = [
  {
    id: 'r-socket',
    caracteristica1Id: CAR_SOCKET_CPU,
    caracteristica2Id: CAR_SOCKET_PLACA,
    operador: 'IGUAL',
    parametro: null,
    templateJustificativa:
      '{comp2.nome} utiliza soquete {val2}, incompatível com {comp1.nome}, que exige soquete {val1}.',
    caracteristica1: { categoriaId: CAT_CPU },
    caracteristica2: { categoriaId: CAT_PLACA },
  },
  {
    id: 'r-memoria',
    caracteristica1Id: CAR_PADRAO_RAM,
    caracteristica2Id: CAR_PADRAO_PLACA,
    operador: 'IGUAL',
    parametro: null,
    templateJustificativa:
      '{comp2.nome} utiliza padrão {val2}, incompatível com {comp1.nome} que é {val1}.',
    caracteristica1: { categoriaId: CAT_RAM },
    caracteristica2: { categoriaId: CAT_PLACA },
  },
  {
    id: 'r-tdp',
    caracteristica1Id: CAR_TDP_GPU,
    caracteristica2Id: CAR_POTENCIA,
    operador: 'MAIOR_OU_IGUAL',
    parametro: '1.25',
    templateJustificativa:
      '{comp2.nome} fornece {val2}W, insuficiente para {comp1.nome} (mínimo {val1_com_margem}W).',
    caracteristica1: { categoriaId: CAT_GPU },
    caracteristica2: { categoriaId: CAT_FONTE },
  },
];

const CATEGORIAS_MOCK = [
  { id: CAT_CPU,   ordem: 1 },
  { id: CAT_PLACA, ordem: 2 },
  { id: CAT_RAM,   ordem: 3 },
  { id: CAT_GPU,   ordem: 4 },
  { id: CAT_FONTE, ordem: 5 },
];

const COMPONENTES_BY_ID: Record<string, Componente> = {
  [ID_CPU]:   CPU,
  [ID_PLACA]: PLACA,
  [ID_RAM]:   RAM,
  [ID_GPU]:   GPU,
  [ID_FONTE]: FONTE,
};

// ---------------------------------------------------------------------------
// Estado: todos os 5 selecionados (cenário incompatível total)
// ---------------------------------------------------------------------------

const ESTADO_5_INCOMPATIVEIS: EstadoConfiguracao = {
  [CAT_CPU]:   ID_CPU,
  [CAT_PLACA]: ID_PLACA,
  [CAT_RAM]:   ID_RAM,
  [CAT_GPU]:   ID_GPU,
  [CAT_FONTE]: ID_FONTE,
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CspService — cenário 5 componentes incompatíveis', () => {
  let service: CspService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CspService,
        ExplanationsService,
        {
          provide: PrismaService,
          useValue: {
            restricao: { findMany: jest.fn().mockResolvedValue(RESTRICOES_MOCK) },
            categoria:  { findMany: jest.fn().mockResolvedValue(CATEGORIAS_MOCK) },
          },
        },
        {
          provide: ComponentsService,
          useValue: {
            buscarPorId: jest.fn((id: string) =>
              Promise.resolve(COMPONENTES_BY_ID[id] ?? null),
            ),
            listarPorCategoriaId: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<CspService>(CspService);
  });

  it('retorna consistente=false', async () => {
    const r = await service.validar(ESTADO_5_INCOMPATIVEIS);
    expect(r.consistente).toBe(false);
  });

  it('todos os 5 componentes selecionados aparecem em valoresBloqueados da sua categoria', async () => {
    const r = await service.validar(ESTADO_5_INCOMPATIVEIS);

    const casos = [
      { catId: CAT_CPU,   compId: ID_CPU   },
      { catId: CAT_PLACA, compId: ID_PLACA },
      { catId: CAT_RAM,   compId: ID_RAM   },
      { catId: CAT_GPU,   compId: ID_GPU   },
      { catId: CAT_FONTE, compId: ID_FONTE },
    ];

    for (const { catId, compId } of casos) {
      const dominio = r.dominios.find((d) => d.categoriaId === catId);
      expect(dominio).toBeDefined();
      const ids = dominio!.valoresBloqueados.map((b) => b.componenteId);
      expect(ids).toContain(compId);
    }
  });

  it('Placa tem exatamente 2 entradas em valoresBloqueados (socket + memória) com mensagens distintas', async () => {
    const r = await service.validar(ESTADO_5_INCOMPATIVEIS);

    const dominioPlaca = r.dominios.find((d) => d.categoriaId === CAT_PLACA);
    expect(dominioPlaca).toBeDefined();

    // 1 componente físico (Placa) com 2 razões — NÃO confundir com 2 componentes
    const bloqueiosPlaca = dominioPlaca!.valoresBloqueados.filter(
      (b) => b.componenteId === ID_PLACA,
    );
    expect(bloqueiosPlaca).toHaveLength(2);

    // As duas mensagens devem ser distintas (socket vs memória)
    const [msg1, msg2] = bloqueiosPlaca.map((b) => b.justificativa.mensagem);
    expect(msg1).not.toBe(msg2);

    // Placa NÃO aparece em valoresValidos (foi removida da csp pelo complemento)
    expect(dominioPlaca!.valoresValidos).not.toContain(ID_PLACA);
  });

  it('as 2 justificativas da Placa referenciam âncoras distintas (CPU para socket, RAM para memória)', async () => {
    const r = await service.validar(ESTADO_5_INCOMPATIVEIS);

    const dominioPlaca = r.dominios.find((d) => d.categoriaId === CAT_PLACA)!;
    const bloqueiosPlaca = dominioPlaca.valoresBloqueados.filter(
      (b) => b.componenteId === ID_PLACA,
    );

    const ancoraIds = bloqueiosPlaca
      .map((b) => b.justificativa.componenteAncora?.id)
      .filter(Boolean) as string[];

    expect(ancoraIds).toContain(ID_CPU);   // âncora da violação de socket
    expect(ancoraIds).toContain(ID_RAM);   // âncora da violação de memória
  });

  it('CPU, RAM, GPU e Fonte têm exatamente 1 entrada cada em valoresBloqueados', async () => {
    const r = await service.validar(ESTADO_5_INCOMPATIVEIS);

    const casos = [
      { catId: CAT_CPU,   compId: ID_CPU   },
      { catId: CAT_RAM,   compId: ID_RAM   },
      { catId: CAT_GPU,   compId: ID_GPU   },
      { catId: CAT_FONTE, compId: ID_FONTE },
    ];

    for (const { catId, compId } of casos) {
      const dominio = r.dominios.find((d) => d.categoriaId === catId)!;
      const bloqueios = dominio.valoresBloqueados.filter((b) => b.componenteId === compId);
      expect(bloqueios).toHaveLength(1);
    }
  });
});
