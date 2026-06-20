import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Componente, CaracteristicaValor } from '@hardware-csp/shared-types';

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
}
