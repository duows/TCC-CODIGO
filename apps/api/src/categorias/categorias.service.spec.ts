/**
 * Testes unitários do CategoriasService — cobre a regra de integridade: não
 * permitir excluir uma Categoria com componentes ou características
 * cadastradas.
 */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriasService } from './categorias.service';

describe('CategoriasService', () => {
  async function mkService(
    overrides: { componenteCount?: number; caracteristicaCount?: number; categoriaExiste?: boolean } = {},
  ) {
    const { componenteCount = 0, caracteristicaCount = 0, categoriaExiste = true } = overrides;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasService,
        {
          provide: PrismaService,
          useValue: {
            categoria: {
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest
                .fn()
                .mockResolvedValue(categoriaExiste ? { id: 'cat1', nome: 'CPU', ordem: 1 } : null),
              create: jest.fn().mockResolvedValue({ id: 'cat1', nome: 'CPU', ordem: 1 }),
              update: jest.fn().mockResolvedValue({ id: 'cat1', nome: 'CPU', ordem: 2 }),
              delete: jest.fn().mockResolvedValue({ id: 'cat1' }),
            },
            componente: { count: jest.fn().mockResolvedValue(componenteCount) },
            caracteristica: { count: jest.fn().mockResolvedValue(caracteristicaCount) },
          },
        },
      ],
    }).compile();

    return module.get(CategoriasService);
  }

  it('bloqueia exclusão quando existem componentes dependentes', async () => {
    const service = await mkService({ componenteCount: 1 });
    await expect(service.deletar('cat1')).rejects.toThrow(ConflictException);
  });

  it('bloqueia exclusão quando existem características dependentes', async () => {
    const service = await mkService({ caracteristicaCount: 1 });
    await expect(service.deletar('cat1')).rejects.toThrow(ConflictException);
  });

  it('permite exclusão quando não há dependentes', async () => {
    const service = await mkService({});
    await expect(service.deletar('cat1')).resolves.toBeUndefined();
  });

  it('lança 404 ao tentar excluir categoria inexistente', async () => {
    const service = await mkService({ categoriaExiste: false });
    await expect(service.deletar('inexistente')).rejects.toThrow(NotFoundException);
  });
});
