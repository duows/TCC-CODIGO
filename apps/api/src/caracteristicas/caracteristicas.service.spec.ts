/**
 * Testes unitários do CaracteristicasService — cobre a regra de integridade:
 * não permitir excluir uma Característica usada em alguma Restrição.
 */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CaracteristicasService } from './caracteristicas.service';

describe('CaracteristicasService', () => {
  async function mkService(
    overrides: { restricaoCount?: number; caracteristicaExiste?: boolean } = {},
  ) {
    const { restricaoCount = 0, caracteristicaExiste = true } = overrides;

    const deleteManyMock = jest.fn().mockResolvedValue({ count: 0 });
    const deleteMock = jest.fn().mockResolvedValue({ id: 'c1' });

    const prisma = {
      caracteristica: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest
          .fn()
          .mockResolvedValue(caracteristicaExiste ? { id: 'c1', categoriaId: 'cat-1' } : null),
        update: jest.fn().mockResolvedValue({ id: 'c1' }),
        delete: deleteMock,
      },
      categoria: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1' }),
      },
      restricao: {
        count: jest.fn().mockResolvedValue(restricaoCount),
      },
      componenteCaracteristica: {
        deleteMany: deleteManyMock,
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CaracteristicasService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    return { service: module.get(CaracteristicasService), prisma, deleteManyMock, deleteMock };
  }

  it('bloqueia exclusão quando usada em alguma restrição', async () => {
    const { service } = await mkService({ restricaoCount: 1 });
    await expect(service.deletar('c1')).rejects.toThrow(ConflictException);
  });

  it('exclui e cascada os valores ComponenteCaracteristica quando não há restrições dependentes', async () => {
    const { service, deleteManyMock, deleteMock } = await mkService({ restricaoCount: 0 });
    await service.deletar('c1');
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { caracteristicaId: 'c1' } });
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('lança 404 ao tentar excluir característica inexistente', async () => {
    const { service } = await mkService({ caracteristicaExiste: false });
    await expect(service.deletar('inexistente')).rejects.toThrow(NotFoundException);
  });
});
