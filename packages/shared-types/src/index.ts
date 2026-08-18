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

/**
 * Alerta de capacidade agregada (pós-condição, RF-XX) — violação de uma soma
 * de demandas (ex.: TDP de CPU + GPU) contra uma capacidade compartilhada
 * (ex.: potência da fonte), derivada de restrições MAIOR_OU_IGUAL que
 * compartilham a mesma característica de capacidade.
 *
 * Estruturalmente distinto de `JustificativaEducativa`: esta é uma
 * propriedade do CONJUNTO de componentes selecionados, não de um único
 * componente bloqueado com no máximo uma âncora. Por isso não reaproveita
 * o mesmo tipo nem o campo `justificativas` — ver csp.service.ts.
 */
export interface AlertaAgregado {
  /** Característica de capacidade violada (ex.: potencia da fonte). */
  caracteristicaCapacidadeId: string;
  /** Componente que fornece a capacidade (ex.: a fonte escolhida). */
  componenteCapacidade: { id: string; categoriaId: string; nome: string };
  /** Componentes que compõem a demanda somada. */
  componentesDemanda: Array<{ id: string; categoriaId: string; nome: string; valor: number }>;
  demandaTotal: number;
  demandaComMargem: number;
  capacidadeDisponivel: number;
  mensagem: string;
}

export interface RespostaValidacao {
  consistente: boolean;
  dominios: DominioVariavel[];
  justificativas: JustificativaEducativa[];
  alertasAgregados: AlertaAgregado[];
  tempoExecucaoMs: number;
}

// ===========================================================================
// Payload da requisição de validação
// ===========================================================================

/**
 * `ajustes` mapeia restricaoId → parametro sobrescrito (mesma convenção de
 * string do campo `Restricao.parametro`). Usado para permitir que o usuário
 * ajuste, por exemplo, a margem de segurança de potência (RF-XX) sem alterar
 * o valor padrão cadastrado no banco.
 */
export interface RequisicaoValidacao {
  estado: EstadoConfiguracao;
  ajustes?: Record<string, string>;
}

// ===========================================================================
// Restrição ajustável — restrições MAIOR_OU_IGUAL cujo parametro pode ser
// sobrescrito pelo usuário por requisição (ex.: margem de segurança da fonte)
// ===========================================================================

export interface RestricaoAjustavel {
  id: string;
  parametroPadrao: string;
}

// ===========================================================================
// Área administrativa — autenticação
// ===========================================================================

export interface LoginDto {
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface ErroApi {
  message: string | string[];
  statusCode: number;
  error?: string;
}

// ===========================================================================
// Enums compartilhados com o Prisma (valores literais, sem depender do
// @prisma/client no frontend)
// ===========================================================================

export type TipoCaracteristica = 'TEXTO' | 'INTEIRO';
export type OperadorRestricao = 'IGUAL' | 'MAIOR_OU_IGUAL';

// ===========================================================================
// Entidades completas da base de conhecimento (área administrativa) — as
// demais interfaces acima (CategoriaInfo, CaracteristicaValor, Componente)
// são as formas de LEITURA já usadas pelo wizard; estas cobrem o CRUD.
// ===========================================================================

export interface Marca {
  id: string;
  nome: string;
}

export interface Caracteristica {
  id: string;
  categoriaId: string;
  nome: string;
  tipo: TipoCaracteristica;
}

export interface Restricao {
  id: string;
  /** Lado da demanda/consumo. */
  caracteristica1Id: string;
  /** Lado da capacidade/oferta. */
  caracteristica2Id: string;
  operador: OperadorRestricao;
  parametro: string | null;
  templateJustificativa: string;
}

// ===========================================================================
// DTOs de escrita (área administrativa) — espelham os DTOs do backend
// ===========================================================================

export interface CriarMarcaDto {
  nome: string;
}
export type AtualizarMarcaDto = CriarMarcaDto;

export interface CriarCategoriaDto {
  nome: string;
  ordem: number;
}
export type AtualizarCategoriaDto = CriarCategoriaDto;

export interface CriarCaracteristicaDto {
  categoriaId: string;
  nome: string;
  tipo: TipoCaracteristica;
}
export interface AtualizarCaracteristicaDto {
  nome: string;
  tipo: TipoCaracteristica;
}

export interface CaracteristicaValorInputDto {
  caracteristicaId: string;
  valor: string;
}

export interface CriarComponenteDto {
  nome: string;
  marcaId: string;
  categoriaId: string;
  caracteristicas: CaracteristicaValorInputDto[];
}
export type AtualizarComponenteDto = CriarComponenteDto;

export interface CriarRestricaoDto {
  caracteristica1Id: string;
  caracteristica2Id: string;
  operador: OperadorRestricao;
  parametro?: string | null;
  templateJustificativa: string;
}
export type AtualizarRestricaoDto = CriarRestricaoDto;
