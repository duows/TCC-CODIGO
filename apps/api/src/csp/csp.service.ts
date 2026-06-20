import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComponentsService } from '../components/components.service';
import { ExplanationsService } from '../explanations/explanations.service';
import { ac3 } from './ac3';
import type { RestricaoInterna, VariavelCSP, ValorRemovido } from './types';
import type {
  EstadoConfiguracao,
  RespostaValidacao,
  DominioVariavel,
} from '@hardware-csp/shared-types';

/**
 * Orquestrador do motor de inferência.
 *
 * Responsabilidades:
 *   1. Carregar categorias, domínios e restrições do banco (camada de dados)
 *   2. Aplicar a atribuição parcial do usuário (colapsar domínios já escolhidos)
 *   3. Invocar o AC-3 sobre o estado resultante (RF-05)
 *   4. Delegar ao motor de explicações a geração das justificativas (RF-10)
 *   5. Empacotar a RespostaValidacao para a camada de apresentação
 *
 * Conforme RNF-06 (separação estrita entre camadas), este serviço é a
 * fronteira da camada de lógica de negócio e não conhece detalhes da UI.
 *
 * Conforme RNF-07 (expansibilidade): adicionar categoria/restrição no banco
 * não requer alteração neste código.
 */
@Injectable()
export class CspService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly components: ComponentsService,
    private readonly explanations: ExplanationsService,
  ) {}

  async validar(estado: EstadoConfiguracao): Promise<RespostaValidacao> {
    const inicio = performance.now();

    // 1) Carregar restrições da base de conhecimento
    const restricoes = await this.carregarRestricoes();
    console.log('[DEBUG CSP] Restrições carregadas (%d):', restricoes.length, restricoes.map((r) => ({ // DEBUG
      id: r.id, varDemanda: r.variavelDemanda, varCapacidade: r.variavelCapacidade, // DEBUG
      operador: r.operador, parametro: r.parametro, // DEBUG
    }))); // DEBUG

    // 2) Carregar domínios iniciais (um por categoria, colapso se já atribuído)
    console.log('[DEBUG CSP] Estado recebido:', estado); // DEBUG
    const variaveis = await this.carregarVariaveis(estado);
    console.log('[DEBUG CSP] Variáveis (domínios iniciais):', variaveis.map((v) => ({ // DEBUG
      categoriaId: v.categoriaId, tamanho: v.dominio.size, // DEBUG
      componentes: Array.from(v.dominio.values()).map((c) => c.nome), // DEBUG
    }))); // DEBUG

    // 3) Propagar restrições via AC-3
    const resultado = ac3(variaveis, restricoes);
    console.log('[DEBUG CSP] Resultado AC-3: consistente=%s, removidos=%d', resultado.consistente, resultado.removidos.length); // DEBUG
    console.log('[DEBUG CSP] Removidos:', resultado.removidos.map((r) => ({ // DEBUG
      categoria: r.categoriaId, componente: r.componente.nome, restricaoOp: r.restricaoViolada.operador, // DEBUG
    }))); // DEBUG

    // 3b) Complementação simétrica — quando AMBOS os lados de uma violação são
    //     selecionados pelo usuário, o lado âncora também deve ser marcado.
    const complementAdded = new Set<string>();
    const complementRemovals: ValorRemovido[] = [];
    for (const removal of resultado.removidos) {
      if (!removal.ancora) continue;
      if (estado[removal.categoriaId] !== removal.componenteId) continue;
      const ancoraCatId = removal.ancora.categoriaId;
      if (estado[ancoraCatId] !== removal.ancora.id) continue;
      const key = `${ancoraCatId}:${removal.ancora.id}:${removal.restricaoViolada.id}`;
      if (!complementAdded.has(key)) {
        complementAdded.add(key);
        complementRemovals.push({
          categoriaId: ancoraCatId,
          componenteId: removal.ancora.id,
          componente: removal.ancora,
          restricaoViolada: removal.restricaoViolada,
          ancora: removal.componente,
        });
      }
    }
    for (const comp of complementRemovals) {
      variaveis.find((v) => v.categoriaId === comp.categoriaId)?.dominio.delete(comp.componenteId);
    }
    const todosRemovedos = [...resultado.removidos, ...complementRemovals];
    console.log('[DEBUG CSP] Complementos simétricos (%d):', complementRemovals.length, complementRemovals.map((r) => ({ // DEBUG
      categoria: r.categoriaId, componente: r.componente.nome, // DEBUG
    }))); // DEBUG

    // 4) Gerar justificativas educativas (RF-10)
    const justificativas = this.explanations.gerarJustificativas(todosRemovedos);
    console.log('[DEBUG CSP] Justificativas (%d):', justificativas.length, justificativas.map((j) => ({ // DEBUG
      categoria: j.categoriaId, bloqueado: j.componenteBloqueado, msg: j.mensagem.slice(0, 80), // DEBUG
    }))); // DEBUG

    // 5) Empacotar resposta
    const dominios: DominioVariavel[] = resultado.variaveis.map((v) => {
      const bloqueados = justificativas
        .filter((j) => j.categoriaId === v.categoriaId)
        .map((j) => ({
          componenteId: j.componenteBloqueado,
          justificativa: j,
        }));

      return {
        categoriaId: v.categoriaId,
        valoresValidos: Array.from(v.dominio.keys()),
        valoresBloqueados: bloqueados,
      };
    });

    const selectedIds = new Set(Object.values(estado));
    const novaConsistente = !todosRemovedos.some((r) => selectedIds.has(r.componenteId));
    console.log('[DEBUG CSP] Resposta final:', { // DEBUG
      consistente: novaConsistente, // DEBUG
      dominios: dominios.map((d) => ({ cat: d.categoriaId, validos: d.valoresValidos.length, bloqueados: d.valoresBloqueados.length })), // DEBUG
    }); // DEBUG
    return {
      consistente: novaConsistente,
      dominios,
      justificativas,
      tempoExecucaoMs: Math.round(performance.now() - inicio),
    };
  }

  // ---------------------------------------------------------------------------
  // Carregamento da base de conhecimento
  // ---------------------------------------------------------------------------

  private async carregarRestricoes(): Promise<RestricaoInterna[]> {
    const linhas = await this.prisma.restricao.findMany({
      include: {
        caracteristica1: { select: { categoriaId: true } },
        caracteristica2: { select: { categoriaId: true } },
      },
    });

    return linhas.map((linha) => ({
      id: linha.id,
      variavelDemanda: linha.caracteristica1.categoriaId,
      variavelCapacidade: linha.caracteristica2.categoriaId,
      caracteristica1Id: linha.caracteristica1Id,
      caracteristica2Id: linha.caracteristica2Id,
      operador: linha.operador as 'IGUAL' | 'MAIOR_OU_IGUAL',
      parametro: linha.parametro ?? undefined,
      templateJustificativa: linha.templateJustificativa,
    }));
  }

  private async carregarVariaveis(estado: EstadoConfiguracao): Promise<VariavelCSP[]> {
    const categorias = await this.prisma.categoria.findMany({ orderBy: { ordem: 'asc' } });
    const variaveis: VariavelCSP[] = [];

    for (const cat of categorias) {
      const idAtribuido = estado[cat.id];

      let componentes;
      if (idAtribuido) {
        const c = await this.components.buscarPorId(idAtribuido);
        componentes = c ? [c] : [];
      } else {
        componentes = await this.components.listarPorCategoriaId(cat.id);
      }

      const dominio = new Map<string, (typeof componentes)[number]>();
      for (const c of componentes) dominio.set(c.id, c);
      variaveis.push({ categoriaId: cat.id, dominio });
    }

    return variaveis;
  }
}
