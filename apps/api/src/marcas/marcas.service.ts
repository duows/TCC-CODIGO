import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMarcaDto, UpdateMarcaDto } from './marca.dto';

@Injectable()
export class MarcasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar() {
    return this.prisma.marca.findMany({ orderBy: { nome: 'asc' } });
  }

  async criar(dto: CreateMarcaDto) {
    return this.prisma.marca.create({ data: { nome: dto.nome } });
  }

  async atualizar(id: string, dto: UpdateMarcaDto) {
    await this.buscarOuFalhar(id);
    return this.prisma.marca.update({ where: { id }, data: { nome: dto.nome } });
  }

  async deletar(id: string) {
    await this.buscarOuFalhar(id);

    const emUso = await this.prisma.componente.count({ where: { marcaId: id } });
    if (emUso > 0) {
      throw new ConflictException(
        `Marca possui ${emUso} componente(s) cadastrado(s) e não pode ser excluída`,
      );
    }

    try {
      await this.prisma.marca.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Marca em uso e não pode ser excluída');
      }
      throw e;
    }
  }

  private async buscarOuFalhar(id: string) {
    const marca = await this.prisma.marca.findUnique({ where: { id } });
    if (!marca) throw new NotFoundException('Marca não encontrada');
    return marca;
  }
}
