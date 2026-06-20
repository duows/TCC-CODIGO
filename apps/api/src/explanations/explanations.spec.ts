/**
 * Testes unitários do motor de explicações (Explanation Facility).
 *
 * Cobrem:
 *   1) substituição de placeholders a partir do templateJustificativa com
 *      âncora presente (caso normal, RF-10);
 *   2) cenário residual de CASCATA sem âncora rastreável: a justificativa
 *      AINDA deriva do templateJustificativa e nomeia a característica em
 *      conflito — nunca cai em texto genérico fixo no serviço
 *      (RNF-13 rastreabilidade, RNF-14 ausência de bloqueios silenciosos).
 *
 * Construído com o modelo genérico EAV, sem Prisma — o serviço é puro.
 */

import { ExplanationsService } from './explanations.service';
import type { RestricaoInterna, ValorRemovido } from '../csp/types';
import type { Componente } from '@hardware-csp/shared-types';

const CAT_CPU = 'cat-cpu';
const CAT_PLACA = 'cat-placa';
const CAR_SOCKET_CPU = 'car-socket-cpu';
const CAR_SOCKET_PLACA = 'car-socket-placa';

function mkCpu(id: string, socket: string): Componente {
  return {
    id,
    nome: `CPU-${id}`,
    marcaNome: 'TestBrand',
    categoriaId: CAT_CPU,
    caracteristicas: [
      { caracteristicaId: CAR_SOCKET_CPU, nome: 'socket', tipo: 'TEXTO', valor: socket },
    ],
  };
}

function mkPlaca(id: string, socketSuportado: string): Componente {
  return {
    id,
    nome: `Placa-${id}`,
    marcaNome: 'TestBrand',
    categoriaId: CAT_PLACA,
    caracteristicas: [
      { caracteristicaId: CAR_SOCKET_PLACA, nome: 'socketSuportado', tipo: 'TEXTO', valor: socketSuportado },
    ],
  };
}

const RESTRICAO_SOCKET: RestricaoInterna = {
  id: 'r-socket',
  variavelDemanda: CAT_CPU,
  variavelCapacidade: CAT_PLACA,
  caracteristica1Id: CAR_SOCKET_CPU,
  caracteristica2Id: CAR_SOCKET_PLACA,
  operador: 'IGUAL',
  templateJustificativa:
    '{comp2.nome} utiliza soquete {val2}, incompatível com {comp1.nome}, que exige soquete {val1}.',
};

describe('ExplanationsService', () => {
  const service = new ExplanationsService();

  it('gera justificativa a partir do template quando há âncora', () => {
    const bloqueada = mkCpu('am4', 'AM4'); // CPU bloqueada (lado car1)
    const ancora = mkPlaca('am5', 'AM5'); // placa que retirou o suporte (lado car2)

    const removido: ValorRemovido = {
      categoriaId: CAT_CPU,
      componenteId: bloqueada.id,
      componente: bloqueada,
      restricaoViolada: RESTRICAO_SOCKET,
      ancora,
    };

    const [j] = service.gerarJustificativas([removido]);

    expect(j.componenteBloqueado).toBe('am4');
    expect(j.componenteAncora?.id).toBe('am5');
    expect(j.mensagem).toBe(
      'Placa-am5 utiliza soquete AM5, incompatível com CPU-am4, que exige soquete AM4.',
    );
  });

  it('cascata sem âncora: ainda deriva justificativa rastreável do template', () => {
    // Simula o caso residual em que o domínio vizinho esvaziou e a remoção
    // chega ao serviço sem âncora. A justificativa NÃO pode ser o texto fixo
    // genérico; deve vir do templateJustificativa e nomear a característica.
    const bloqueada = mkCpu('am4', 'AM4'); // lado car1

    const removidoSemAncora: ValorRemovido = {
      categoriaId: CAT_CPU,
      componenteId: bloqueada.id,
      componente: bloqueada,
      restricaoViolada: RESTRICAO_SOCKET,
      ancora: undefined,
    };

    const [j] = service.gerarJustificativas([removidoSemAncora]);

    // Rastreável até a restrição: o lado conhecido (a CPU bloqueada) é preenchido…
    expect(j.mensagem).toContain('CPU-am4');
    expect(j.mensagem).toContain('AM4');
    // …e a característica em conflito (vinda do template) é nomeada.
    expect(j.mensagem.toLowerCase()).toContain('soquete');
    // Nunca o texto genérico fixo do antigo fallback.
    expect(j.mensagem).not.toBe(
      'CPU-am4 é incompatível com os demais componentes selecionados.',
    );
    // Não vaza placeholder cru por falta da âncora.
    expect(j.mensagem).not.toContain('{comp2.nome}');
    // Sem âncora rastreável única, não inventa componenteAncora.
    expect(j.componenteAncora).toBeUndefined();
  });
});
