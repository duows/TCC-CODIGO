/**
 * Testes unitários da parte de escrita do RestricoesService — cobre as
 * regras de integridade do cadastro de Restricao.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RestricoesService } from './restricoes.service';

const CAT_CPU = 'cat-cpu';
const CAT_FONTE = 'cat-fonte';
const CAR_TDP = 'car-tdp'; // INTEIRO, categoria CPU
const CAR_POTENCIA = 'car-potencia'; // INTEIRO, categoria Fonte
const CAR_SOCKET_CPU = 'car-socket-cpu'; // TEXTO, categoria CPU
const CAR_NOME_FONTE = 'car-nome-fonte'; // TEXTO, categoria Fonte (mesma categoria de CAR_POTENCIA)

const CARACTERISTICAS = [
  { id: CAR_TDP, categoriaId: CAT_CPU, nome: 'tdp', tipo: 'INTEIRO' },
  { id: CAR_POTENCIA, categoriaId: CAT_FONTE, nome: 'potencia', tipo: 'INTEIRO' },
  { id: CAR_SOCKET_CPU, categoriaId: CAT_CPU, nome: 'socket', tipo: 'TEXTO' },
  { id: CAR_NOME_FONTE, categoriaId: CAT_FONTE, nome: 'nome', tipo: 'TEXTO' },
];

describe('RestricoesService (escrita)', () => {
  async function mkService() {
    const create = jest.fn().mockResolvedValue({ id: 'r1' });

    const prisma: any = {
      restricao: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'r1' }),
        create,
        update: jest.fn().mockResolvedValue({ id: 'r1' }),
        delete: jest.fn().mockResolvedValue({ id: 'r1' }),
      },
      caracteristica: {
        findMany: jest.fn((args: any) =>
          Promise.resolve(CARACTERISTICAS.filter((c) => args.where.id.in.includes(c.id))),
        ),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RestricoesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    return { service: module.get(RestricoesService), create };
  }

  it('rejeita restrição entre características da mesma categoria', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({
        caracteristica1Id: CAR_TDP,
        caracteristica2Id: CAR_SOCKET_CPU, // mesma categoria (CPU)
        operador: 'IGUAL',
        templateJustificativa: 'x',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita MAIOR_OU_IGUAL sem parametro', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({
        caracteristica1Id: CAR_TDP,
        caracteristica2Id: CAR_POTENCIA,
        operador: 'MAIOR_OU_IGUAL',
        templateJustificativa: 'x',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita MAIOR_OU_IGUAL quando uma característica não é INTEIRO', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({
        caracteristica1Id: CAR_SOCKET_CPU,
        caracteristica2Id: CAR_NOME_FONTE,
        operador: 'MAIOR_OU_IGUAL',
        parametro: '1.25',
        templateJustificativa: 'x',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejeita IGUAL com parametro informado', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({
        caracteristica1Id: CAR_TDP,
        caracteristica2Id: CAR_POTENCIA,
        operador: 'IGUAL',
        parametro: '1',
        templateJustificativa: 'x',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('cria com sucesso um caso MAIOR_OU_IGUAL válido', async () => {
    const { service, create } = await mkService();
    await service.criar({
      caracteristica1Id: CAR_TDP,
      caracteristica2Id: CAR_POTENCIA,
      operador: 'MAIOR_OU_IGUAL',
      parametro: '1.25',
      templateJustificativa: 'x',
    } as any);
    expect(create).toHaveBeenCalled();
  });

  it('404 quando alguma característica não existe', async () => {
    const { service } = await mkService();
    await expect(
      service.criar({
        caracteristica1Id: 'inexistente',
        caracteristica2Id: CAR_POTENCIA,
        operador: 'IGUAL',
        templateJustificativa: 'x',
      } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
