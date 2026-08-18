import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CategoriaInfo } from '@hardware-csp/shared-types';
import type { CreateCategoriaDto, UpdateCategoriaDto } from './categoria.dto';

/**
 * Serviço de categorias — expõe as variáveis X do CSP para o wizard.
 *
 * O frontend usa este endpoint para montar a sequência de passos
 * dinamicamente, sem depender de lista hardcoded.
 */
@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(): Promise<CategoriaInfo[]> {
    return this.prisma.categoria.findMany({
      select: { id: true, nome: true, ordem: true },
      orderBy: { ordem: 'asc' },
    });
  }

  async criar(dto: CreateCategoriaDto) {
    return this.prisma.categoria.create({ data: { nome: dto.nome, ordem: dto.ordem } });
  }

  async atualizar(id: string, dto: UpdateCategoriaDto) {
    await this.buscarOuFalhar(id);
    return this.prisma.categoria.update({
      where: { id },
      data: { nome: dto.nome, ordem: dto.ordem },
    });
  }

  async deletar(id: string) {
    await this.buscarOuFalhar(id);

    const [componentes, caracteristicas] = await Promise.all([
      this.prisma.componente.count({ where: { categoriaId: id } }),
      this.prisma.caracteristica.count({ where: { categoriaId: id } }),
    ]);
    if (componentes > 0 || caracteristicas > 0) {
      throw new ConflictException(
        `Categoria possui ${componentes} componente(s) e ${caracteristicas} característica(s) cadastrada(s) e não pode ser excluída`,
      );
    }

    try {
      await this.prisma.categoria.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Categoria em uso e não pode ser excluída');
      }
      throw e;
    }
  }

  private async buscarOuFalhar(id: string) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');
    return categoria;
  }
}
