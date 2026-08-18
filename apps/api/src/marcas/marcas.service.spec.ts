/**
 * Testes unitários do MarcasService — cobre a regra de integridade: não
 * permitir excluir uma Marca com componentes cadastrados.
 */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MarcasService } from './marcas.service';

describe('MarcasService', () => {
  async function mkService(overrides: { componenteCount?: number; marcaExiste?: boolean } = {}) {
    const { componenteCount = 0, marcaExiste = true } = overrides;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarcasService,
        {
          provide: PrismaService,
          useValue: {
            marca: {
              findMany: jest.fn().mockResolvedValue([]),
              findUnique: jest.fn().mockResolvedValue(marcaExiste ? { id: 'm1', nome: 'AMD' } : null),
              update: jest.fn().mockResolvedValue({ id: 'm1', nome: 'AMD Atualizada' }),
              delete: jest.fn().mockResolvedValue({ id: 'm1' }),
            },
            componente: {
              count: jest.fn().mockResolvedValue(componenteCount),
            },
          },
        },
      ],
    }).compile();

    return module.get(MarcasService);
  }

  it('bloqueia exclusão quando a marca possui componentes cadastrados', async () => {
    const service = await mkService({ componenteCount: 2 });
    await expect(service.deletar('m1')).rejects.toThrow(ConflictException);
  });

  it('permite exclusão quando a marca não possui componentes', async () => {
    const service = await mkService({ componenteCount: 0 });
    await expect(service.deletar('m1')).resolves.toBeUndefined();
  });

  it('lança 404 ao tentar excluir marca inexistente', async () => {
    const service = await mkService({ marcaExiste: false });
    await expect(service.deletar('inexistente')).rejects.toThrow(NotFoundException);
  });
});
