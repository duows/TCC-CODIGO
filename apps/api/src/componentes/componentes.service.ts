import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { Componente, CaracteristicaValor } from '@hardware-csp/shared-types';
import type { CreateComponenteDto, UpdateComponenteDto } from './component.dto';

type ComponenteComRelacoes = {
  id: string;
  nome: string;
  categoriaId: string;
  marca: { nome: string };
  caracteristicas: Array<{
    caracteristicaId: string;
    valor: string;
    caracteristica: { id: string; nome: string; tipo: string };
  }>;
};

function mapToComponente(row: ComponenteComRelacoes): Componente {
  const caracteristicas: CaracteristicaValor[] = row.caracteristicas.map((cc) => ({
    caracteristicaId: cc.caracteristicaId,
    nome: cc.caracteristica.nome,
    tipo: cc.caracteristica.tipo as 'TEXTO' | 'INTEIRO',
    valor: cc.valor,
  }));
  return {
    id: row.id,
    nome: row.nome,
    marcaNome: row.marca.nome,
    categoriaId: row.categoriaId,
    caracteristicas,
  };
}

const incluirRelacoes = {
  marca: { select: { nome: true } },
  caracteristicas: {
    include: {
      caracteristica: { select: { id: true, nome: true, tipo: true } },
    },
  },
} as const;

/**
 * Acesso à camada de dados — componentes do catálogo (RF-17).
 *
 * Tabela única `componente` + join EAV com `componente_caracteristica`.
 * Adicionar uma nova categoria ou atributo não requer alteração aqui.
 */
@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorCategoriaId(categoriaId: string): Promise<Componente[]> {
    const rows = await this.prisma.componente.findMany({
      where: { categoriaId },
      include: incluirRelacoes,
      orderBy: { nome: 'asc' },
    });
    return rows.map(mapToComponente);
  }

  async buscarPorId(id: string): Promise<Componente | null> {
    const row = await this.prisma.componente.findUnique({
      where: { id },
      include: incluirRelacoes,
    });
    return row ? mapToComponente(row) : null;
  }

  /**
   * Valida categoriaId/marcaId e que o conjunto de características enviado
   * corresponde EXATAMENTE às características definidas para a categoria
   * (nem faltando, nem de categoria errada) — um conjunto incompleto
   * quebraria silenciosamente as checagens agregadas do CspService em vez
   * de falhar de forma clara no momento do cadastro.
   */
  private async validarDto(dto: CreateComponenteDto | UpdateComponenteDto) {
    const categoria = await this.prisma.categoria.findUnique({ where: { id: dto.categoriaId } });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');

    const marca = await this.prisma.marca.findUnique({ where: { id: dto.marcaId } });
    if (!marca) throw new NotFoundException('Marca não encontrada');

    const definidas = await this.prisma.caracteristica.findMany({
      where: { categoriaId: dto.categoriaId },
    });
    const definidasPorId = new Map(definidas.map((c) => [c.id, c]));

    const enviadasIds = dto.caracteristicas.map((c) => c.caracteristicaId);
    const foraDaCategoria = enviadasIds.filter((id) => !definidasPorId.has(id));
    if (foraDaCategoria.length > 0) {
      throw new BadRequestException(
        `Característica(s) não pertencem à categoria informada: ${foraDaCategoria.join(', ')}`,
      );
    }

    const enviadasSet = new Set(enviadasIds);
    const faltando = definidas.filter((c) => !enviadasSet.has(c.id)).map((c) => c.nome);
    if (faltando.length > 0) {
      throw new BadRequestException(
        `Valor(es) obrigatório(s) não informado(s) para: ${faltando.join(', ')}`,
      );
    }

    for (const item of dto.caracteristicas) {
      const definicao = definidasPorId.get(item.caracteristicaId)!;
      if (definicao.tipo === 'INTEIRO' && !Number.isFinite(Number(item.valor))) {
        throw new BadRequestException(
          `Valor de "${definicao.nome}" deve ser numérico (recebido: "${item.valor}")`,
        );
      }
    }
  }

  async criar(dto: CreateComponenteDto): Promise<Componente> {
    await this.validarDto(dto);

    const componenteId = await this.prisma.$transaction(async (tx) => {
      const componente = await tx.componente.create({
        data: { nome: dto.nome, categoriaId: dto.categoriaId, marcaId: dto.marcaId },
      });
      await tx.componenteCaracteristica.createMany({
        data: dto.caracteristicas.map((c) => ({
          componenteId: componente.id,
          caracteristicaId: c.caracteristicaId,
          valor: c.valor,
        })),
      });
      return componente.id;
    });

    return (await this.buscarPorId(componenteId))!;
  }

  async atualizar(id: string, dto: UpdateComponenteDto): Promise<Componente> {
    await this.buscarComponenteOuFalhar(id);
    await this.validarDto(dto);

    await this.prisma.$transaction(async (tx) => {
      await tx.componenteCaracteristica.deleteMany({ where: { componenteId: id } });
      await tx.componente.update({
        where: { id },
        data: { nome: dto.nome, categoriaId: dto.categoriaId, marcaId: dto.marcaId },
      });
      await tx.componenteCaracteristica.createMany({
        data: dto.caracteristicas.map((c) => ({
          componenteId: id,
          caracteristicaId: c.caracteristicaId,
          valor: c.valor,
        })),
      });
    });

    return (await this.buscarPorId(id))!;
  }

  async deletar(id: string): Promise<void> {
    await this.buscarComponenteOuFalhar(id);

    try {
      await this.prisma.$transaction([
        this.prisma.componenteCaracteristica.deleteMany({ where: { componenteId: id } }),
        this.prisma.componente.delete({ where: { id } }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Componente em uso e não pode ser excluído');
      }
      throw e;
    }
  }

  private async buscarComponenteOuFalhar(id: string) {
    const componente = await this.prisma.componente.findUnique({ where: { id } });
    if (!componente) throw new NotFoundException('Componente não encontrado');
    return componente;
  }
}
