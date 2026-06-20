/**
 * Tipos compartilhados entre frontend (Next.js) e backend (NestJS).
 *
 * Modelo genérico EAV — a tripla CSP <X, D, C> é configurável via banco.
 * Não existe mais union type fixo de categorias nem interfaces por tipo de hardware.
 */

// ===========================================================================
// Categoria (variável X do CSP) — vem do banco, não hardcoded
// ===========================================================================

export interface CategoriaInfo {
  id: string;
  nome: string;    // "CPU", "Placa-Mãe", etc.
  ordem: number;   // sequência no wizard
}

// ===========================================================================
// Componente — entidade base do domínio D
//
// Atributos técnicos específicos (socket, tdp, potencia…) vivem em
// `caracteristicas` (EAV), não como campos fixos deste tipo.
// ===========================================================================

export interface CaracteristicaValor {
  caracteristicaId: string;
  nome: string;              // nome legível da característica
  tipo: 'TEXTO' | 'INTEIRO';
  valor: string;             // sempre string; converter para Number quando tipo=INTEIRO
}

export interface Componente {
  id: string;
  nome: string;
  marcaNome: string;
  categoriaId: string;
  caracteristicas: CaracteristicaValor[];
}

// ===========================================================================
// Estado da configuração — atribuição parcial do CSP
//
// Mapeia categoriaId → componenteId.
// Conforme RNF-11 (API stateless): enviado completo a cada requisição.
// ===========================================================================

export type EstadoConfiguracao = Record<string, string>;

// ===========================================================================
// Resposta da validação (resultado do AC-3)
// ===========================================================================

/**
 * Justificativa educativa (RF-10) — mensagem gerada a partir do
 * templateJustificativa da Restricao, com placeholders substituídos
 * pelos valores reais dos componentes.
 */
export interface JustificativaEducativa {
  componenteBloqueado: string;
  categoriaId: string;
  mensagem: string;
  componenteAncora?: {
    id: string;
    categoriaId: string;
    nome: string;
  };
}

/**
 * Domínio atualizado de uma variável após propagação AC-3.
 * RF-03: componentes bloqueados aparecem com justificativa, não são ocultos.
 */
export interface DominioVariavel {
  categoriaId: string;
  valoresValidos: string[];
  valoresBloqueados: Array<{
    componenteId: string;
    justificativa: JustificativaEducativa;
  }>;
}

export interface RespostaValidacao {
  consistente: boolean;
  dominios: DominioVariavel[];
  justificativas: JustificativaEducativa[];
  tempoExecucaoMs: number;
}

// ===========================================================================
// Payload da requisição de validação
// ===========================================================================

export interface RequisicaoValidacao {
  estado: EstadoConfiguracao;
}
