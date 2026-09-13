import { OperadorRestricao, TipoCaracteristica } from '@prisma/client';
import { fechar, limparBanco, prismaTest } from './integration-db';
import { main as seedBaseConhecimento } from '../../prisma/seed';

/**
 * Testes de integração com Postgres real (RF-17, RF-18, RF-19).
 *
 * Roda contra um banco de teste descartável (nunca o de desenvolvimento — ver
 * a guarda de segurança em integration-db.ts). Não usa .spec.ts para nunca ser
 * coletado pela suíte padrão (`pnpm test`).
 */
describe('Base de conhecimento — integração com Postgres real (RF-17, RF-18, RF-19)', () => {
  beforeAll(async () => {
    await limparBanco();
  });

  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await fechar();
  });

  describe('RF-17 — armazenar e consultar a base de conhecimento do CSP', () => {
    it('persiste marca, categoria, componente e característica e os relacionamentos batem na consulta', async () => {
      const marca = await prismaTest.marca.create({ data: { nome: 'AMD-Teste' } });
      const categoria = await prismaTest.categoria.create({
        data: { nome: 'CPU-Teste', ordem: 1 },
      });
      const caracteristica = await prismaTest.caracteristica.create({
        data: { categoriaId: categoria.id, nome: 'socket', tipo: TipoCaracteristica.TEXTO },
      });
      const componente = await prismaTest.componente.create({
        data: { nome: 'Ryzen Teste', marcaId: marca.id, categoriaId: categoria.id },
      });
      await prismaTest.componenteCaracteristica.create({
        data: { componenteId: componente.id, caracteristicaId: caracteristica.id, valor: 'AM5' },
      });

      const encontrado = await prismaTest.componente.findUniqueOrThrow({
        where: { id: componente.id },
        include: {
          marca: true,
          categoria: true,
          caracteristicas: { include: { caracteristica: true } },
        },
      });

      expect(encontrado.nome).toBe('Ryzen Teste');
      expect(encontrado.marca.id).toBe(marca.id);
      expect(encontrado.marca.nome).toBe('AMD-Teste');
      expect(encontrado.categoria.id).toBe(categoria.id);
      expect(encontrado.categoria.nome).toBe('CPU-Teste');
      expect(encontrado.caracteristicas).toHaveLength(1);
      expect(encontrado.caracteristicas[0]?.valor).toBe('AM5');
      expect(encontrado.caracteristicas[0]?.caracteristica.nome).toBe('socket');
    });

    it('impede excluir uma Marca com Componente associado — a garantia vem do schema (FK), não só do serviço', async () => {
      const marca = await prismaTest.marca.create({ data: { nome: 'MarcaComVinculo' } });
      const categoria = await prismaTest.categoria.create({
        data: { nome: 'CategoriaVinculo', ordem: 1 },
      });
      await prismaTest.componente.create({
        data: { nome: 'ComponenteVinculado', marcaId: marca.id, categoriaId: categoria.id },
      });

      // Chama o Prisma diretamente, sem passar pelo MarcasService, para provar que
      // a rejeição vem da constraint de chave estrangeira do banco: confirmado
      // empiricamente contra o Postgres real (P2003, "Foreign key constraint
      // violated: componente_marcaId_fkey (index)") — não é um pré-check do
      // query engine do lado do cliente (que seria P2014).
      let erro: unknown;
      try {
        await prismaTest.marca.delete({ where: { id: marca.id } });
      } catch (e) {
        erro = e;
      }

      expect(erro).toBeDefined();
      expect((erro as { code?: string }).code).toBe('P2003');

      const marcaAindaExiste = await prismaTest.marca.findUnique({ where: { id: marca.id } });
      expect(marcaAindaExiste).not.toBeNull();
    });

    it('persiste valores string e inteiros sem perda de precisão nem truncamento pelo driver', async () => {
      const marca = await prismaTest.marca.create({ data: { nome: 'MarcaPrecisao' } });
      const categoria = await prismaTest.categoria.create({
        // 2147483647 = limite do Int32 do Postgres (Categoria.ordem é o único
        // campo verdadeiramente numérico do schema — o resto do EAV é String).
        data: { nome: 'CategoriaPrecisao', ordem: 2147483647 },
      });
      const caracteristica = await prismaTest.caracteristica.create({
        data: { categoriaId: categoria.id, nome: 'potencia', tipo: TipoCaracteristica.INTEIRO },
      });
      const componente = await prismaTest.componente.create({
        data: { nome: 'ComponentePrecisao', marcaId: marca.id, categoriaId: categoria.id },
      });
      // String decimal longa que um float64 arredondaria se fosse convertida.
      const valorDecimalExato = '749.999999999999999';
      await prismaTest.componenteCaracteristica.create({
        data: {
          componenteId: componente.id,
          caracteristicaId: caracteristica.id,
          valor: valorDecimalExato,
        },
      });

      const categoriaLida = await prismaTest.categoria.findUniqueOrThrow({
        where: { id: categoria.id },
      });
      const valorLido = await prismaTest.componenteCaracteristica.findFirstOrThrow({
        where: { componenteId: componente.id },
      });

      expect(categoriaLida.ordem).toBe(2147483647);
      expect(valorLido.valor).toBe(valorDecimalExato);
    });
  });

  describe('RF-18 — popular base de conhecimento via Database Seeding', () => {
    it('roda o seed contra o banco de teste limpo e cadastra categorias, marcas e componentes esperados', async () => {
      await seedBaseConhecimento();

      await expect(prismaTest.marca.count()).resolves.toBe(7);
      await expect(prismaTest.categoria.count()).resolves.toBe(5);
      await expect(prismaTest.caracteristica.count()).resolves.toBe(19);
      await expect(prismaTest.componente.count()).resolves.toBe(32);
      await expect(prismaTest.restricao.count()).resolves.toBe(4);

      const nomesMarcas = (await prismaTest.marca.findMany({ select: { nome: true } }))
        .map((m) => m.nome)
        .sort();
      expect(nomesMarcas).toEqual(
        ['AMD', 'ASUS', 'Corsair', 'FSP', 'G.Skill', 'Kingston', 'MSI'].sort(),
      );
    });

    it('roda o seed duas vezes seguidas sem duplicar registros nem lançar erro', async () => {
      // seed.ts faz deleteMany() em ordem reversa de FK no início de main(), a
      // cada chamada — por isso rodar duas vezes é seguro: a segunda chamada
      // limpa o que a primeira criou antes de recriar, então a contagem final
      // não dobra (idempotência por autolimpeza, não por upsert).
      await seedBaseConhecimento();
      await seedBaseConhecimento();

      await expect(prismaTest.marca.count()).resolves.toBe(7);
      await expect(prismaTest.categoria.count()).resolves.toBe(5);
      await expect(prismaTest.caracteristica.count()).resolves.toBe(19);
      await expect(prismaTest.componente.count()).resolves.toBe(32);
      await expect(prismaTest.restricao.count()).resolves.toBe(4);
    });
  });

  describe('RF-19 — armazenar e consultar o conjunto de restrições', () => {
    it('persiste uma Restricao vinculando duas Caracteristica e a consulta traz operador e parâmetro corretos', async () => {
      const categoriaCpu = await prismaTest.categoria.create({ data: { nome: 'CPU-R', ordem: 1 } });
      const categoriaFonte = await prismaTest.categoria.create({
        data: { nome: 'Fonte-R', ordem: 2 },
      });
      const tdp = await prismaTest.caracteristica.create({
        data: { categoriaId: categoriaCpu.id, nome: 'tdp', tipo: TipoCaracteristica.INTEIRO },
      });
      const potencia = await prismaTest.caracteristica.create({
        data: { categoriaId: categoriaFonte.id, nome: 'potencia', tipo: TipoCaracteristica.INTEIRO },
      });

      const restricao = await prismaTest.restricao.create({
        data: {
          caracteristica1Id: tdp.id,
          caracteristica2Id: potencia.id,
          operador: OperadorRestricao.MAIOR_OU_IGUAL,
          parametro: '1.25',
          templateJustificativa: 'teste',
        },
      });

      const lida = await prismaTest.restricao.findUniqueOrThrow({ where: { id: restricao.id } });
      expect(lida.operador).toBe(OperadorRestricao.MAIOR_OU_IGUAL);
      expect(lida.parametro).toBe('1.25');
      expect(lida.caracteristica1Id).toBe(tdp.id);
      expect(lida.caracteristica2Id).toBe(potencia.id);
    });

    it('o schema NÃO impede restrição entre características da mesma categoria — a regra é só de serviço', async () => {
      // A Seção 8.2.5 do TCC proíbe uma Restricao ligar duas Caracteristica da
      // mesma Categoria, mas essa regra está apenas em
      // RestricoesService.validarDto (apps/api/src/restricoes/restricoes.service.ts)
      // — não há nenhum @@unique/CHECK no schema.prisma que a replique. Este
      // teste comprova que o INSERT bruto é aceito pelo Postgres; a rejeição já
      // é testada com Prisma mockado em restricoes.service.spec.ts, então não é
      // duplicada aqui.
      const categoria = await prismaTest.categoria.create({
        data: { nome: 'CPU-MesmaCat', ordem: 1 },
      });
      const carA = await prismaTest.caracteristica.create({
        data: { categoriaId: categoria.id, nome: 'tdp', tipo: TipoCaracteristica.INTEIRO },
      });
      const carB = await prismaTest.caracteristica.create({
        data: { categoriaId: categoria.id, nome: 'socket', tipo: TipoCaracteristica.TEXTO },
      });

      await expect(
        prismaTest.restricao.create({
          data: {
            caracteristica1Id: carA.id,
            caracteristica2Id: carB.id,
            operador: OperadorRestricao.IGUAL,
            templateJustificativa: 'teste',
          },
        }),
      ).resolves.toBeDefined();
    });
  });
});
