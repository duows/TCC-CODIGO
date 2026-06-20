import { Injectable } from '@nestjs/common';
import type { JustificativaEducativa, Componente } from '@hardware-csp/shared-types';
import type { ValorRemovido } from '../csp/types';

/**
 * Explanation Facility (Clancey, 1983).
 *
 * Substitui placeholders do templateJustificativa (vindo do banco) pelos
 * valores reais dos componentes. O serviço não conhece "socket", "tdp" ou
 * qualquer termo técnico — toda a semântica está nos dados (RNF-07).
 *
 * Placeholders suportados:
 *   {comp1.nome}      — nome do componente no lado car1 (demanda)
 *   {val1}            — valor de car1 no componente 1
 *   {comp2.nome}      — nome do componente no lado car2 (capacidade)
 *   {val2}            — valor de car2 no componente 2
 *   {val1_com_margem} — Math.round(Number(val1) * Number(parametro))
 *                       (exclusivo de MAIOR_OU_IGUAL)
 *
 * Requisitos atendidos:
 *   RF-10 (Justificativa técnica para cada incompatibilidade)
 *   RF-11, RF-12, RF-13 (alertas por tipo — texto vem do seed, não do código)
 *   RNF-03 (Linguagem natural acessível)
 *   RNF-13 (Rastreabilidade — XAI, Barredo Arrieta et al., 2020)
 *   RNF-14 (Ausência de bloqueios silenciosos)
 */
@Injectable()
export class ExplanationsService {
  gerarJustificativas(removidos: ValorRemovido[]): JustificativaEducativa[] {
    return removidos.map((r) => this.formatar(r));
  }

  private formatar(r: ValorRemovido): JustificativaEducativa {
    const restricao = r.restricaoViolada;
    const bloqueado = r.componente;
    const ancora = r.ancora;

    // O componente bloqueado é sempre conhecido e seu lado (car1/demanda ou
    // car2/capacidade) é determinado pela categoria. A âncora — o vizinho que
    // retirou o suporte — normalmente também é conhecida; no caso residual em
    // que o domínio vizinho já havia esvaziado (sem âncora rastreável única),
    // o seu lado fica indeterminado, mas a justificativa AINDA é derivada do
    // templateJustificativa da restrição violada, nunca de texto fixo no
    // serviço (RNF-13 rastreabilidade, RNF-14 ausência de bloqueios silenciosos).
    const bloqueadoNaDemanda = r.categoriaId === restricao.variavelDemanda;

    // Lado do componente bloqueado: sempre determinável.
    // Lado da âncora: determinável apenas quando há âncora.
    const comp1Nome = bloqueadoNaDemanda ? bloqueado.nome : ancora?.nome;
    const comp2Nome = bloqueadoNaDemanda ? ancora?.nome : bloqueado.nome;
    const val1 = bloqueadoNaDemanda
      ? getValor(bloqueado, restricao.caracteristica1Id)
      : ancora && getValor(ancora, restricao.caracteristica1Id);
    const val2 = bloqueadoNaDemanda
      ? ancora && getValor(ancora, restricao.caracteristica2Id)
      : getValor(bloqueado, restricao.caracteristica2Id);

    let mensagem = restricao.templateJustificativa
      .replace('{comp1.nome}', comp1Nome ?? COMPONENTE_VIZINHO)
      .replace('{val1}', val1 || '')
      .replace('{comp2.nome}', comp2Nome ?? COMPONENTE_VIZINHO)
      .replace('{val2}', val2 || '');

    if (restricao.operador === 'MAIOR_OU_IGUAL' && restricao.parametro && val1) {
      const val1ComMargem = Math.round(Number(val1) * Number(restricao.parametro));
      mensagem = mensagem.replace('{val1_com_margem}', String(val1ComMargem));
    }

    const justificativa: JustificativaEducativa = {
      componenteBloqueado: bloqueado.id,
      categoriaId: r.categoriaId,
      mensagem,
    };

    if (ancora) {
      justificativa.componenteAncora = {
        id: ancora.id,
        categoriaId: ancora.categoriaId,
        nome: ancora.nome,
      };
    }

    return justificativa;
  }
}

/**
 * Referência genérica (sem termo de domínio) ao componente vizinho quando,
 * no caso residual, não há âncora rastreável única. A característica em
 * conflito continua nomeada pelo próprio templateJustificativa.
 */
const COMPONENTE_VIZINHO = 'outro componente selecionado';

function getValor(componente: Componente, caracteristicaId: string): string | undefined {
  return componente.caracteristicas.find((c) => c.caracteristicaId === caracteristicaId)?.valor;
}
