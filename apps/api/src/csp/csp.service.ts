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
  AlertaAgregado,
  Componente,
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

  async validar(
    estado: EstadoConfiguracao,
    ajustes?: Record<string, string>,
  ): Promise<RespostaValidacao> {
    const inicio = performance.now();

    // 1) Carregar restrições da base de conhecimento
    const restricoes = await this.carregarRestricoes();

    // 1b) Aplicar sobrescritas de parametro enviadas pelo usuário (ex.: margem
    //     de segurança da fonte). Entradas inválidas ou fora do dominio de um
    //     multiplicador (>= 1) são ignoradas, mantendo o padrão do banco.
    if (ajustes) {
      for (const r of restricoes) {
        const override = ajustes[r.id];
        if (override === undefined) continue;
        const valor = Number(override);
        if (!Number.isFinite(valor) || valor < 1) continue;
        r.parametro = override;
      }
    }

    // 2) Carregar domínios iniciais (um por categoria, colapso se já atribuído)
    const variaveis = await this.carregarVariaveis(estado);

    // 2b) Capturar os componentes efetivamente selecionados ANTES do AC-3, que
    //     muta os domínios in-place e pode remover o próprio valor selecionado
    //     (ex.: viola uma restrição binária). A verificação agregada (passo 3c)
    //     precisa da seleção física do usuário, não do domínio pós-poda.
    const selecionados = this.capturarSelecionados(estado, variaveis);

    // 3) Propagar restrições via AC-3
    const resultado = ac3(variaveis, restricoes);

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

    // 3c) Verificação agregada de capacidade (pós-condição, fora do grafo
    //     binário — ver calcularAlertasAgregados). Não influencia `consistente`
    //     nem `justificativas`; é um sinal próprio e independente.
    const alertasAgregados = this.calcularAlertasAgregados(restricoes, selecionados);

    // 4) Gerar justificativas educativas (RF-10)
    const justificativas = this.explanations.gerarJustificativas(todosRemovedos);

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
    return {
      consistente: novaConsistente,
      dominios,
      justificativas,
      alertasAgregados,
      tempoExecucaoMs: Math.round(performance.now() - inicio),
    };
  }

  // ---------------------------------------------------------------------------
  // Verificação agregada de capacidade (pós-condição)
  // ---------------------------------------------------------------------------

  /**
   * Snapshot dos componentes fisicamente selecionados pelo usuário
   * (categoriaId → Componente), lido do domínio ANTES da propagação AC-3.
   */
  private capturarSelecionados(
    estado: EstadoConfiguracao,
    variaveis: VariavelCSP[],
  ): Map<string, Componente> {
    const selecionados = new Map<string, Componente>();
    for (const v of variaveis) {
      const idAtribuido = estado[v.categoriaId];
      if (!idAtribuido) continue;
      const componente = v.dominio.get(idAtribuido);
      if (componente) selecionados.set(v.categoriaId, componente);
    }
    return selecionados;
  }

  /**
   * Verificação agregada de capacidade, executada como PÓS-CONDIÇÃO sobre a
   * configuração completa — fora do grafo de restrições binárias do AC-3.
   *
   * Motivação: restrições MAIOR_OU_IGUAL são binárias e por componente
   * (ex.: CPU↔Fonte, GPU↔Fonte), então aprovam configurações cuja SOMA das
   * demandas excede a capacidade compartilhada, mesmo que cada uma
   * isoladamente passe (ex.: CPU 170W×1.25=212.5W ≤ 600W e GPU 450W×1.25=
   * 562.5W ≤ 600W, mas a soma real de 620W excede a fonte). A soma é uma
   * restrição N-ária e não cabe no grafo binário do AC-3 (RNF-02) — por isso
   * é avaliada aqui, separadamente, sobre a seleção completa do usuário.
   *
   * Totalmente derivada dos dados (RNF-07/08): agrupa as restrições
   * MAIOR_OU_IGUAL que compartilham a mesma `caracteristica2Id` (lado da
   * capacidade); os `caracteristica1Id` do grupo são as demandas somadas.
   * Nenhuma categoria ou característica é conhecida por nome neste código.
   */
  private calcularAlertasAgregados(
    restricoes: RestricaoInterna[],
    selecionados: Map<string, Componente>,
  ): AlertaAgregado[] {
    const gruposPorCapacidade = new Map<string, RestricaoInterna[]>();
    for (const r of restricoes) {
      if (r.operador !== 'MAIOR_OU_IGUAL') continue;
      const grupo = gruposPorCapacidade.get(r.caracteristica2Id);
      if (grupo) grupo.push(r);
      else gruposPorCapacidade.set(r.caracteristica2Id, [r]);
    }

    const alertas: AlertaAgregado[] = [];

    for (const [caracteristicaCapacidadeId, grupo] of gruposPorCapacidade) {
      const primeiraRestricao = grupo[0];
      if (!primeiraRestricao) continue;

      // Grupo de tamanho 1 é a própria restrição binária — o AC-3 já a cobre
      // via `justificativas`. Avaliar aqui duplicaria o mesmo sinal em dois
      // formatos (justificativa vermelha + alerta agregado âmbar).
      if (grupo.length < 2) continue;

      const componenteCapacidade = selecionados.get(primeiraRestricao.variavelCapacidade);
      if (!componenteCapacidade) continue; // categoria de capacidade não escolhida

      const capacidadeValor = valorCaracteristica(componenteCapacidade, caracteristicaCapacidadeId);
      if (capacidadeValor === undefined) continue;

      const componentesDemanda: AlertaAgregado['componentesDemanda'] = [];
      let demandaTotal = 0;
      let configuracaoCompleta = true;

      for (const r of grupo) {
        const componenteDemanda = selecionados.get(r.variavelDemanda);
        const valor =
          componenteDemanda && valorCaracteristica(componenteDemanda, r.caracteristica1Id);
        if (!componenteDemanda || valor === undefined) {
          configuracaoCompleta = false;
          break;
        }
        demandaTotal += valor;
        componentesDemanda.push({
          id: componenteDemanda.id,
          categoriaId: componenteDemanda.categoriaId,
          nome: componenteDemanda.nome,
          valor,
        });
      }
      // Configuração incompleta (alguma categoria de demanda ou a de
      // capacidade ainda não escolhida) não produz alerta — nada a somar.
      if (!configuracaoCompleta) continue;

      const parametrosDoGrupo = new Set(grupo.map((r) => r.parametro ?? '1'));
      if (parametrosDoGrupo.size > 1) {
        throw new Error(
          `Restrições agregadas para a característica de capacidade '${caracteristicaCapacidadeId}' ` +
            `têm parâmetros de margem divergentes (${[...parametrosDoGrupo].join(', ')}) — ` +
            'não há uma margem única para aplicar à soma das demandas.',
        );
      }
      const margem = Number([...parametrosDoGrupo][0]);

      const demandaComMargem = demandaTotal * margem;
      if (demandaComMargem <= capacidadeValor) continue; // dentro da capacidade

      alertas.push({
        caracteristicaCapacidadeId,
        componenteCapacidade: {
          id: componenteCapacidade.id,
          categoriaId: componenteCapacidade.categoriaId,
          nome: componenteCapacidade.nome,
        },
        componentesDemanda,
        demandaTotal,
        demandaComMargem: Math.round(demandaComMargem),
        capacidadeDisponivel: capacidadeValor,
        mensagem: montarMensagemAgregada(
          componentesDemanda,
          demandaTotal,
          demandaComMargem,
          capacidadeValor,
          componenteCapacidade.nome,
        ),
      });
    }

    return alertas;
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

function valorCaracteristica(componente: Componente, caracteristicaId: string): number | undefined {
  const bruto = componente.caracteristicas.find((c) => c.caracteristicaId === caracteristicaId)?.valor;
  if (bruto === undefined) return undefined;
  const numero = Number(bruto);
  return Number.isFinite(numero) ? numero : undefined;
}

function montarMensagemAgregada(
  componentesDemanda: AlertaAgregado['componentesDemanda'],
  demandaTotal: number,
  demandaComMargem: number,
  capacidadeDisponivel: number,
  nomeComponenteCapacidade: string,
): string {
  const nomes = componentesDemanda.map((c) => `${c.nome} (${c.valor}W)`).join(' + ');
  return (
    `${nomes} somam ${demandaTotal}W, exigindo ${Math.round(demandaComMargem)}W com margem de ` +
    `segurança — acima dos ${capacidadeDisponivel}W disponíveis em ${nomeComponenteCapacidade}.`
  );
}
