import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CategoriaInfo } from '@hardware-csp/shared-types';

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
}
