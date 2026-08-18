import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCaracteristicaDto, UpdateCaracteristicaDto } from './caracteristica.dto';

@Injectable()
export class CaracteristicasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.caracteristica.findMany({ orderBy: [{ categoriaId: 'asc' }, { nome: 'asc' }] });
  }

  async listarPorCategoria(categoriaId: string) {
    return this.prisma.caracteristica.findMany({
      where: { categoriaId },
      orderBy: { nome: 'asc' },
    });
  }

  async criar(dto: CreateCaracteristicaDto) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id: dto.categoriaId } });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');

    return this.prisma.caracteristica.create({
      data: { categoriaId: dto.categoriaId, nome: dto.nome, tipo: dto.tipo },
    });
  }

  async atualizar(id: string, dto: UpdateCaracteristicaDto) {
    await this.buscarOuFalhar(id);
    return this.prisma.caracteristica.update({
      where: { id },
      data: { nome: dto.nome, tipo: dto.tipo },
    });
  }

  async deletar(id: string) {
    await this.buscarOuFalhar(id);

    const emRestricao = await this.prisma.restricao.count({
      where: { OR: [{ caracteristica1Id: id }, { caracteristica2Id: id }] },
    });
    if (emRestricao > 0) {
      throw new ConflictException(
        `Característica utilizada em ${emRestricao} restrição(ões) e não pode ser excluída`,
      );
    }

    try {
      await this.prisma.$transaction([
        this.prisma.componenteCaracteristica.deleteMany({ where: { caracteristicaId: id } }),
        this.prisma.caracteristica.delete({ where: { id } }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Característica em uso e não pode ser excluída');
      }
      throw e;
    }
  }

  private async buscarOuFalhar(id: string) {
    const caracteristica = await this.prisma.caracteristica.findUnique({ where: { id } });
    if (!caracteristica) throw new NotFoundException('Característica não encontrada');
    return caracteristica;
  }
}
