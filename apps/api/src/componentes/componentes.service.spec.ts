/**
 * Testes unitários da parte de escrita do ComponentsService: validação do
 * conjunto de características EAV e upsert transacional.
 */

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ComponentsService } from './components.service';

const CATEGORIA_ID = 'cat-cpu';
const MARCA_ID = 'marca-amd';
const CAR_SOCKET = 'car-socket';
const CAR_TDP = 'car-tdp';

const CARACTERISTICAS_DA_CATEGORIA = [
  { id: CAR_SOCKET, categoriaId: CATEGORIA_ID, nome: 'socket', tipo: 'TEXTO' },
  { id: CAR_TDP, categoriaId: CATEGORIA_ID, nome: 'tdp', tipo: 'INTEIRO' },
];

function mkComponenteRow(id: string) {
  return {
    id,
    nome: 'Ryzen 5 7600',
    categoriaId: CATEGORIA_ID,
    marca: { nome: 'AMD' },
    caracteristicas: [
      { caracteristicaId: CAR_SOCKET, valor: 'AM5', caracteristica: { id: CAR_SOCKET, nome: 'socket', tipo: 'TEXTO' } },
      { caracteristicaId: CAR_TDP, valor: '65', caracteristica: { id: CAR_TDP, nome: 'tdp', tipo: 'INTEIRO' } },
    ],
  };
}

describe('ComponentsService (escrita)', () => {
  async function mkService(overrides: {
    categoriaExiste?: boolean;
    marcaExiste?: boolean;
    componenteExiste?: boolean;
  } = {}) {
    const { categoriaExiste = true, marcaExiste = true, componenteExiste = true } = overrides;

    const componenteCreate = jest.fn().mockResolvedValue({ id: 'comp-1' });
    const componenteCaracteristicaCreateMany = jest.fn().mockResolvedValue({ count: 2 });
    const componenteCaracteristicaDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const componenteUpdate = jest.fn().mockResolvedValue({ id: 'comp-1' });
    const componenteDelete = jest.fn().mockResolvedValue({ id: 'comp-1' });
    const componenteFindUnique = jest
      .fn()
      .mockResolvedValue(componenteExiste ? mkComponenteRow('comp-1') : null);

    const prisma: any = {
      categoria: { findUnique: jest.fn().mockResolvedValue(categoriaExiste ? { id: CATEGORIA_ID } : null) },
      marca: { findUnique: jest.fn().mockResolvedValue(marcaExiste ? { id: MARCA_ID } : null) },
      caracteristica: { findMany: jest.fn().mockResolvedValue(CARACTERISTICAS_DA_CATEGORIA) },
      componente: {
        create: componenteCreate,
        update: componenteUpdate,
        delete: componenteDelete,
        findUnique: componenteFindUnique,
      },
      componenteCaracteristica: {
        createMany: componenteCaracteristicaCreateMany,
        deleteMany: componenteCaracteristicaDeleteMany,
      },
      $transaction: jest.fn((arg: any) => {
        if (typeof arg === 'function') return arg(prisma);
        return Promise.all(arg);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ComponentsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    return {
      service: module.get(ComponentsService),
      componenteCreate,
      componenteCaracteristicaCreateMany,
      componenteCaracteristicaDeleteMany,
      componenteDelete,
    };
  }

  const dtoValido = {
    categoriaId: CATEGORIA_ID,
    marcaId: MARCA_ID,
    nome: 'Ryzen 5 7600',
    caracteristicas: [
      { caracteristicaId: CAR_SOCKET, valor: 'AM5' },
      { caracteristicaId: CAR_TDP, valor: '65' },
    ],
  };

  it('404 quando categoriaId não existe', async () => {
    const { service } = await mkService({ categoriaExiste: false });
    await expect(service.criar(dtoValido)).rejects.toThrow(NotFoundException);
  });

  it('404 quando marcaId não existe', async () => {
    const { service } = await mkService({ marcaExiste: false });
    await expect(service.criar(dtoValido)).rejects.toThrow(NotFoundException);
  });

  it('rejeita característica que não pertence à categoria', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({ ...dtoValido, caracteristicas: [{ caracteristicaId: 'car-de-outra-categoria', valor: 'x' }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita conjunto incompleto de características', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({ ...dtoValido, caracteristicas: [{ caracteristicaId: CAR_SOCKET, valor: 'AM5' }] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita valor não numérico para característica INTEIRO', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({
        ...dtoValido,
        caracteristicas: [
          { caracteristicaId: CAR_SOCKET, valor: 'AM5' },
          { caracteristicaId: CAR_TDP, valor: 'não-numero' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('cria o componente e as ComponenteCaracteristica em transação', async () => {
    const { service, componenteCreate, componenteCaracteristicaCreateMany } = await mkService();
    await service.criar(dtoValido);
    expect(componenteCreate).toHaveBeenCalledWith({
      data: { nome: dtoValido.nome, categoriaId: CATEGORIA_ID, marcaId: MARCA_ID },
    });
    expect(componenteCaracteristicaCreateMany).toHaveBeenCalled();
  });

  it('atualizar apaga e recria as ComponenteCaracteristica (delete-then-recreate)', async () => {
    const { service, componenteCaracteristicaDeleteMany, componenteCaracteristicaCreateMany } =
      await mkService();
    await service.atualizar('comp-1', dtoValido);
    expect(componenteCaracteristicaDeleteMany).toHaveBeenCalledWith({ where: { componenteId: 'comp-1' } });
    expect(componenteCaracteristicaCreateMany).toHaveBeenCalled();
  });

  it('404 ao atualizar componente inexistente', async () => {
    const { service } = await mkService({ componenteExiste: false });
    await expect(service.atualizar('comp-inexistente', dtoValido)).rejects.toThrow(NotFoundException);
  });

  it('excluir remove ComponenteCaracteristica e depois o Componente', async () => {
    const { service, componenteCaracteristicaDeleteMany, componenteDelete } = await mkService();
    await service.deletar('comp-1');
    expect(componenteCaracteristicaDeleteMany).toHaveBeenCalledWith({ where: { componenteId: 'comp-1' } });
    expect(componenteDelete).toHaveBeenCalledWith({ where: { id: 'comp-1' } });
  });

  it('404 ao excluir componente inexistente', async () => {
    const { service } = await mkService({ componenteExiste: false });
    await expect(service.deletar('comp-inexistente')).rejects.toThrow(NotFoundException);
  });
});
