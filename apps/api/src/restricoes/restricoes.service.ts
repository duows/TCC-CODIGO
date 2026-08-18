import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RestricaoAjustavel } from '@hardware-csp/shared-types';
import type { CreateRestricaoDto, UpdateRestricaoDto } from './restricao.dto';

/**
 * Restrições ajustáveis pelo usuário — restrições MAIOR_OU_IGUAL cuja
 * característica do lado da capacidade se chama "potencia" (convenção de
 * nome, igual à usada pelo frontend para "tdp" no cálculo de consumo).
 *
 * Isso cobre a margem de segurança da fonte (CPU→Fonte, GPU→Fonte) e
 * qualquer restrição futura de potência cadastrada apenas via dado, sem
 * exigir alteração de código (RNF-07).
 */
@Injectable()
export class RestricoesService {
  constructor(private readonly prisma: PrismaService) {}

  async listarAjustaveis(): Promise<RestricaoAjustavel[]> {
    const linhas = await this.prisma.restricao.findMany({
      where: {
        operador: 'MAIOR_OU_IGUAL',
        caracteristica2: { nome: 'potencia' },
      },
      select: { id: true, parametro: true },
    });

    return linhas.map((linha) => ({
      id: linha.id,
      parametroPadrao: linha.parametro ?? '1',
    }));
  }

  async listar() {
    return this.prisma.restricao.findMany({ orderBy: { id: 'asc' } });
  }

  /**
   * Regras de integridade (RF/RNF do cadastro de Restricao):
   *  - as duas características não podem pertencer à mesma categoria
   *    (não há aresta de uma variável do CSP para ela mesma);
   *  - MAIOR_OU_IGUAL exige parametro e ambas as características INTEIRO;
   *  - IGUAL não aceita parametro (mantém o dado consistente com o
   *    comentário do schema: "nulo para IGUAL").
   */
  private async validarDto(dto: CreateRestricaoDto | UpdateRestricaoDto) {
    const caracteristicas = await this.prisma.caracteristica.findMany({
      where: { id: { in: [dto.caracteristica1Id, dto.caracteristica2Id] } },
    });

    const car1 = caracteristicas.find((c) => c.id === dto.caracteristica1Id);
    const car2 = caracteristicas.find((c) => c.id === dto.caracteristica2Id);
    if (!car1 || !car2) {
      const faltando = [
        !car1 ? dto.caracteristica1Id : null,
        !car2 ? dto.caracteristica2Id : null,
      ].filter(Boolean);
      throw new NotFoundException(`Característica(s) não encontrada(s): ${faltando.join(', ')}`);
    }

    if (car1.categoriaId === car2.categoriaId) {
      throw new BadRequestException(
        'Restrição não pode ligar duas características da mesma categoria',
      );
    }

    if (dto.operador === 'MAIOR_OU_IGUAL') {
      if (!dto.parametro) {
        throw new BadRequestException('parametro é obrigatório para o operador MAIOR_OU_IGUAL');
      }
      if (car1.tipo !== 'INTEIRO' || car2.tipo !== 'INTEIRO') {
        throw new BadRequestException(
          'MAIOR_OU_IGUAL exige características do tipo INTEIRO em ambos os lados',
        );
      }
    } else if (dto.parametro) {
      throw new BadRequestException('parametro não se aplica ao operador IGUAL');
    }
  }

  async criar(dto: CreateRestricaoDto) {
    await this.validarDto(dto);
    return this.prisma.restricao.create({
      data: {
        caracteristica1Id: dto.caracteristica1Id,
        caracteristica2Id: dto.caracteristica2Id,
        operador: dto.operador,
        parametro: dto.parametro ?? null,
        templateJustificativa: dto.templateJustificativa,
      },
    });
  }

  async atualizar(id: string, dto: UpdateRestricaoDto) {
    await this.buscarOuFalhar(id);
    await this.validarDto(dto);
    return this.prisma.restricao.update({
      where: { id },
      data: {
        caracteristica1Id: dto.caracteristica1Id,
        caracteristica2Id: dto.caracteristica2Id,
        operador: dto.operador,
        parametro: dto.parametro ?? null,
        templateJustificativa: dto.templateJustificativa,
      },
    });
  }

  async deletar(id: string) {
    await this.buscarOuFalhar(id);
    await this.prisma.restricao.delete({ where: { id } });
  }

  private async buscarOuFalhar(id: string) {
    const restricao = await this.prisma.restricao.findUnique({ where: { id } });
    if (!restricao) throw new NotFoundException('Restrição não encontrada');
    return restricao;
  }
}
