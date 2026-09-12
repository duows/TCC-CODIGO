/**
 * Teste de integração HTTP da rota central do sistema: prova que o pipeline
 * completo (ValidationPipe global, roteamento, CspService, ac3(), complementação
 * simétrica, alertas agregados e ExplanationsService) funciona de ponta a ponta
 * via HTTP — algo que csp.service.spec.ts (nível de serviço) não cobre.
 *
 * Segue o mesmo padrão de auth.e2e.spec.ts: Test.createTestingModule,
 * supertest, PrismaService sobrescrito por um duplo de teste. Nenhum Postgres
 * real é necessário.
 *
 * Como ComponentsService roda de verdade neste teste (só PrismaService é
 * mockado), o mock do Prisma devolve o formato de linha EAV joined que
 * ComponentsService.mapToComponente espera — marca: { nome } e
 * caracteristicas: [{ caracteristicaId, valor, caracteristica: { id, nome, tipo } }]
 * — diferente do shape `Componente` plano usado em csp.service.spec.ts.
 *
 * Base de conhecimento fixture (arco-consistente ANTES de qualquer seleção —
 * todo valor de todo domínio tem ao menos um suportador em cada variável
 * vizinha):
 *   - Soquete (CPU ↔ PLACA_MAE): cpu-am5↔placa-am5 (AM5), cpu-am4↔placa-am4 (AM4).
 *   - Padrão de memória (PLACA_MAE ↔ RAM): placa-am4(DDR4)↔ram-ddr4, placa-am5(DDR5)↔ram-ddr5.
 *   - Capacidade (CPU→FONTE, GPU→FONTE, MAIOR_OU_IGUAL margem 1.25): fonte-600
 *     suporta cpu-am5/cpu-am4 (170W×1.25=212.5W) e gpu-450 (450W×1.25=562.5W)
 *     isoladamente; só a SOMA (620W×1.25=775W) excede a fonte — é isso que o
 *     alerta agregado (pós-condição, fora do grafo binário do AC-3) detecta.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { ConfigurationsModule } from './configurations.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

// ---------------------------------------------------------------------------
// IDs de teste (categorias e características fictícias)
// ---------------------------------------------------------------------------

const CAT_CPU = 'cat-cpu';
const CAT_PLACA = 'cat-placa';
const CAT_RAM = 'cat-ram';
const CAT_GPU = 'cat-gpu';
const CAT_FONTE = 'cat-fonte';

const CAR_SOCKET_CPU = 'car-socket-cpu';
const CAR_SOCKET_PLACA = 'car-socket-placa';
const CAR_PADRAO_RAM = 'car-padrao-ram';
const CAR_PADRAO_PLACA = 'car-padrao-placa';
const CAR_TDP_CPU = 'car-tdp-cpu';
const CAR_TDP_GPU = 'car-tdp-gpu';
const CAR_POTENCIA = 'car-potencia';

const CATEGORIAS_MOCK = [
  { id: CAT_CPU, ordem: 1 },
  { id: CAT_PLACA, ordem: 2 },
  { id: CAT_RAM, ordem: 3 },
  { id: CAT_GPU, ordem: 4 },
  { id: CAT_FONTE, ordem: 5 },
];

// ---------------------------------------------------------------------------
// Restrições no shape exato que o Prisma retorna com include (ver
// CspService.carregarRestricoes): caracteristica1/2 aninhados só com categoriaId.
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
    id: 'r-cpu-fonte',
    caracteristica1Id: CAR_TDP_CPU,
    caracteristica2Id: CAR_POTENCIA,
    operador: 'MAIOR_OU_IGUAL',
    parametro: '1.25',
    templateJustificativa:
      '{comp2.nome} fornece {val2}W, insuficiente para {comp1.nome} (mínimo {val1_com_margem}W).',
    caracteristica1: { categoriaId: CAT_CPU },
    caracteristica2: { categoriaId: CAT_FONTE },
  },
  {
    id: 'r-gpu-fonte',
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

// ---------------------------------------------------------------------------
// Componentes no shape de linha real do Prisma (ComponenteComRelacoes, ver
// ComponentsService.mapToComponente) — não o shape plano `Componente`.
// ---------------------------------------------------------------------------

type ComponenteRow = {
  id: string;
  nome: string;
  categoriaId: string;
  marca: { nome: string };
  caracteristicas: Array<{
    caracteristicaId: string;
    valor: string;
    caracteristica: { id: string; nome: string; tipo: string };
  }>;
};

function mkRow(
  id: string,
  nome: string,
  categoriaId: string,
  marcaNome: string,
  valores: Array<[caracteristicaId: string, nomeCaracteristica: string, tipo: string, valor: string]>,
): ComponenteRow {
  return {
    id,
    nome,
    categoriaId,
    marca: { nome: marcaNome },
    caracteristicas: valores.map(([caracteristicaId, nomeCaracteristica, tipo, valor]) => ({
      caracteristicaId,
      valor,
      caracteristica: { id: caracteristicaId, nome: nomeCaracteristica, tipo },
    })),
  };
}

const CPU_AM5 = mkRow('cpu-am5', 'CPU AM5', CAT_CPU, 'AMD', [
  [CAR_SOCKET_CPU, 'socket', 'TEXTO', 'AM5'],
  [CAR_TDP_CPU, 'tdp', 'INTEIRO', '170'],
]);
const CPU_AM4 = mkRow('cpu-am4', 'CPU AM4', CAT_CPU, 'AMD', [
  [CAR_SOCKET_CPU, 'socket', 'TEXTO', 'AM4'],
  [CAR_TDP_CPU, 'tdp', 'INTEIRO', '170'],
]);
const PLACA_AM4 = mkRow('placa-am4', 'Placa AM4', CAT_PLACA, 'ASUS', [
  [CAR_SOCKET_PLACA, 'socketSuportado', 'TEXTO', 'AM4'],
  [CAR_PADRAO_PLACA, 'padraoMemoria', 'TEXTO', 'DDR4'],
]);
const PLACA_AM5 = mkRow('placa-am5', 'Placa AM5', CAT_PLACA, 'ASUS', [
  [CAR_SOCKET_PLACA, 'socketSuportado', 'TEXTO', 'AM5'],
  [CAR_PADRAO_PLACA, 'padraoMemoria', 'TEXTO', 'DDR5'],
]);
const RAM_DDR4 = mkRow('ram-ddr4', 'RAM DDR4', CAT_RAM, 'Kingston', [
  [CAR_PADRAO_RAM, 'padrao', 'TEXTO', 'DDR4'],
]);
const RAM_DDR5 = mkRow('ram-ddr5', 'RAM DDR5', CAT_RAM, 'Kingston', [
  [CAR_PADRAO_RAM, 'padrao', 'TEXTO', 'DDR5'],
]);
const GPU_450 = mkRow('gpu-450', 'GPU 450W', CAT_GPU, 'AMD', [
  [CAR_TDP_GPU, 'tdp', 'INTEIRO', '450'],
]);
const FONTE_600 = mkRow('fonte-600', 'Fonte 600W', CAT_FONTE, 'Corsair', [
  [CAR_POTENCIA, 'potencia', 'INTEIRO', '600'],
]);

const COMPONENTES_MOCK: ComponenteRow[] = [
  CPU_AM5,
  CPU_AM4,
  PLACA_AM4,
  PLACA_AM5,
  RAM_DDR4,
  RAM_DDR5,
  GPU_450,
  FONTE_600,
];

// ---------------------------------------------------------------------------
// Duplo de teste do PrismaService — apenas os métodos realmente exercitados
// pelo caminho CspService → ComponentsService no fluxo de validação.
// ---------------------------------------------------------------------------

const prismaMock = {
  restricao: {
    findMany: jest.fn().mockResolvedValue(RESTRICOES_MOCK),
  },
  categoria: {
    findMany: jest.fn().mockResolvedValue(CATEGORIAS_MOCK),
  },
  componente: {
    findMany: jest.fn(({ where }: { where: { categoriaId: string } }) =>
      Promise.resolve(COMPONENTES_MOCK.filter((c) => c.categoriaId === where.categoriaId)),
    ),
    findUnique: jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(COMPONENTES_MOCK.find((c) => c.id === where.id) ?? null),
    ),
  },
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Configurations (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ConfigurationsModule, PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('T1 — estado vazio: todos os domínios completos, nenhum valor bloqueado', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/configurations/validate')
      .send({ estado: {} });

    expect(res.status).toBe(201);
    expect(res.body.consistente).toBe(true);

    const catalogoPorCategoria: Record<string, string[]> = {
      [CAT_CPU]: ['cpu-am5', 'cpu-am4'],
      [CAT_PLACA]: ['placa-am4', 'placa-am5'],
      [CAT_RAM]: ['ram-ddr4', 'ram-ddr5'],
      [CAT_GPU]: ['gpu-450'],
      [CAT_FONTE]: ['fonte-600'],
    };

    for (const [categoriaId, ids] of Object.entries(catalogoPorCategoria)) {
      const dominio = res.body.dominios.find((d: { categoriaId: string }) => d.categoriaId === categoriaId);
      expect(dominio).toBeDefined();
      expect([...dominio.valoresValidos].sort()).toEqual([...ids].sort());
      expect(dominio.valoresBloqueados).toHaveLength(0);
    }
  });

  it('T2 — CPU AM5 fixada: placa AM4 bloqueada, e a propagação em cadeia bloqueia RAM DDR4', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/configurations/validate')
      .send({ estado: { [CAT_CPU]: 'cpu-am5' } });

    expect(res.status).toBe(201);

    const dominioPlaca = res.body.dominios.find(
      (d: { categoriaId: string }) => d.categoriaId === CAT_PLACA,
    );
    expect(dominioPlaca).toBeDefined();
    const bloqueioPlacaAm4 = dominioPlaca.valoresBloqueados.find(
      (b: { componenteId: string }) => b.componenteId === 'placa-am4',
    );
    expect(bloqueioPlacaAm4).toBeDefined();
    expect(typeof bloqueioPlacaAm4.justificativa.mensagem).toBe('string');
    expect(bloqueioPlacaAm4.justificativa.mensagem.length).toBeGreaterThan(0);

    // Propagação em cadeia (o comportamento central do motor): com placa-am4
    // removida, placa-am5 (DDR5) é o único valor remanescente no domínio de
    // PLACA_MAE, e ram-ddr4 perde seu único suportador — deve aparecer
    // bloqueada também, com justificativa própria, sem que RAM tenha sido
    // diretamente comparada com a CPU.
    const dominioRam = res.body.dominios.find(
      (d: { categoriaId: string }) => d.categoriaId === CAT_RAM,
    );
    expect(dominioRam).toBeDefined();
    const bloqueioRamDdr4 = dominioRam.valoresBloqueados.find(
      (b: { componenteId: string }) => b.componenteId === 'ram-ddr4',
    );
    expect(bloqueioRamDdr4).toBeDefined();
    expect(typeof bloqueioRamDdr4.justificativa.mensagem).toBe('string');
    expect(bloqueioRamDdr4.justificativa.mensagem.length).toBeGreaterThan(0);
  });

  it('T3 — CPU + GPU + Fonte selecionadas: alerta agregado de capacidade dispara', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/configurations/validate')
      .send({
        estado: {
          [CAT_CPU]: 'cpu-am5',
          [CAT_GPU]: 'gpu-450',
          [CAT_FONTE]: 'fonte-600',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.alertasAgregados).toHaveLength(1);

    const alerta = res.body.alertasAgregados[0];
    expect(alerta.caracteristicaCapacidadeId).toBe(CAR_POTENCIA);
    expect(alerta.componenteCapacidade.id).toBe('fonte-600');
    expect(alerta.demandaTotal).toBe(620);
    expect(alerta.demandaComMargem).toBe(775);
    expect(alerta.capacidadeDisponivel).toBe(600);
    expect(alerta.componentesDemanda.map((c: { id: string }) => c.id).sort()).toEqual(
      ['cpu-am5', 'gpu-450'].sort(),
    );
    // Mensagem não acoplada ao texto exato: o template é dado da base de
    // conhecimento e pode ser editado pelo administrador sem representar
    // regressão — só a string não vazia é garantida.
    expect(typeof alerta.mensagem).toBe('string');
    expect(alerta.mensagem.length).toBeGreaterThan(0);
  });
});
