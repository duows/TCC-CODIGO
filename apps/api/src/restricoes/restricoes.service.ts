import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RestricaoAjustavel } from '@hardware-csp/shared-types';

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
}
