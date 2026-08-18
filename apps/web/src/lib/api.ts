import type {
  AtualizarCaracteristicaDto,
  AtualizarCategoriaDto,
  AtualizarComponenteDto,
  AtualizarMarcaDto,
  AtualizarRestricaoDto,
  Caracteristica,
  CategoriaInfo,
  Componente,
  CriarCaracteristicaDto,
  CriarCategoriaDto,
  CriarComponenteDto,
  CriarMarcaDto,
  CriarRestricaoDto,
  ErroApi,
  EstadoConfiguracao,
  LoginResponse,
  Marca,
  RespostaValidacao,
  Restricao,
  RestricaoAjustavel,
} from '@hardware-csp/shared-types';
import { clearToken, getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** Anexa o token do admin (área administrativa) no header Authorization. */
  auth?: boolean;
};

/**
 * Helper compartilhado por toda chamada HTTP. Normaliza o formato de erro do
 * Nest (`{ message: string | string[] }`) e, para chamadas autenticadas, trata
 * 401 de forma centralizada (limpa o token e redireciona para o login) — os
 * formulários da área administrativa nunca precisam tratar sessão expirada.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: string | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  if (options.auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  if (!res.ok) {
    if (res.status === 401 && options.auth) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.location.assign('/admin/login');
      }
    }

    let mensagem = 'Falha na requisição';
    try {
      const corpo: ErroApi = await res.json();
      mensagem = Array.isArray(corpo.message) ? corpo.message.join('; ') : corpo.message ?? mensagem;
    } catch {
      // corpo não é JSON — mantém a mensagem genérica
    }
    throw new ApiError(mensagem, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Cliente HTTP para a API REST do backend.
 *
 * Conforme RNF-11, todas as chamadas de validação são stateless — o estado da
 * configuração é enviado por inteiro a cada requisição.
 */
export const api = {
  // ---------------------------------------------------------------------
  // Wizard (público)
  // ---------------------------------------------------------------------

  async listarCategorias(): Promise<CategoriaInfo[]> {
    return request<CategoriaInfo[]>('/categorias');
  },

  async listarComponentes(categoriaId: string): Promise<Componente[]> {
    return request<Componente[]>(`/components/${categoriaId}`);
  },

  async buscarComponente(categoriaId: string, id: string): Promise<Componente> {
    return request<Componente>(`/components/${categoriaId}/${id}`);
  },

  async validarConfiguracao(
    estado: EstadoConfiguracao,
    ajustes?: Record<string, string>,
  ): Promise<RespostaValidacao> {
    return request<RespostaValidacao>('/configurations/validate', {
      method: 'POST',
      body: ajustes ? { estado, ajustes } : { estado },
    });
  },

  async listarRestricoesAjustaveis(): Promise<RestricaoAjustavel[]> {
    return request<RestricaoAjustavel[]>('/restricoes/ajustaveis');
  },

  // ---------------------------------------------------------------------
  // Autenticação (área administrativa)
  // ---------------------------------------------------------------------

  async login(senha: string): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/login', { method: 'POST', body: { senha } });
  },

  // ---------------------------------------------------------------------
  // Marca
  // ---------------------------------------------------------------------

  async listarMarcas(): Promise<Marca[]> {
    return request<Marca[]>('/marcas');
  },

  async criarMarca(dto: CriarMarcaDto): Promise<Marca> {
    return request<Marca>('/marcas', { method: 'POST', body: dto, auth: true });
  },

  async atualizarMarca(id: string, dto: AtualizarMarcaDto): Promise<Marca> {
    return request<Marca>(`/marcas/${id}`, { method: 'PUT', body: dto, auth: true });
  },

  async excluirMarca(id: string): Promise<void> {
    return request<void>(`/marcas/${id}`, { method: 'DELETE', auth: true });
  },

  // ---------------------------------------------------------------------
  // Categoria
  // ---------------------------------------------------------------------

  async criarCategoria(dto: CriarCategoriaDto): Promise<CategoriaInfo> {
    return request<CategoriaInfo>('/categorias', { method: 'POST', body: dto, auth: true });
  },

  async atualizarCategoria(id: string, dto: AtualizarCategoriaDto): Promise<CategoriaInfo> {
    return request<CategoriaInfo>(`/categorias/${id}`, { method: 'PUT', body: dto, auth: true });
  },

  async excluirCategoria(id: string): Promise<void> {
    return request<void>(`/categorias/${id}`, { method: 'DELETE', auth: true });
  },

  // ---------------------------------------------------------------------
  // Caracteristica
  // ---------------------------------------------------------------------

  async listarCaracteristicas(): Promise<Caracteristica[]> {
    return request<Caracteristica[]>('/caracteristicas');
  },

  async criarCaracteristica(dto: CriarCaracteristicaDto): Promise<Caracteristica> {
    return request<Caracteristica>('/caracteristicas', { method: 'POST', body: dto, auth: true });
  },

  async atualizarCaracteristica(id: string, dto: AtualizarCaracteristicaDto): Promise<Caracteristica> {
    return request<Caracteristica>(`/caracteristicas/${id}`, {
      method: 'PUT',
      body: dto,
      auth: true,
    });
  },

  async excluirCaracteristica(id: string): Promise<void> {
    return request<void>(`/caracteristicas/${id}`, { method: 'DELETE', auth: true });
  },

  // ---------------------------------------------------------------------
  // Componente (escrita — a leitura usa listarComponentes/buscarComponente acima)
  // ---------------------------------------------------------------------

  async criarComponente(dto: CriarComponenteDto): Promise<Componente> {
    return request<Componente>('/components', { method: 'POST', body: dto, auth: true });
  },

  async atualizarComponente(id: string, dto: AtualizarComponenteDto): Promise<Componente> {
    return request<Componente>(`/components/${id}`, { method: 'PUT', body: dto, auth: true });
  },

  async excluirComponente(id: string): Promise<void> {
    return request<void>(`/components/${id}`, { method: 'DELETE', auth: true });
  },

  // ---------------------------------------------------------------------
  // Restricao
  // ---------------------------------------------------------------------

  async listarRestricoes(): Promise<Restricao[]> {
    return request<Restricao[]>('/restricoes');
  },

  async criarRestricao(dto: CriarRestricaoDto): Promise<Restricao> {
    return request<Restricao>('/restricoes', { method: 'POST', body: dto, auth: true });
  },

  async atualizarRestricao(id: string, dto: AtualizarRestricaoDto): Promise<Restricao> {
    return request<Restricao>(`/restricoes/${id}`, { method: 'PUT', body: dto, auth: true });
  },

  async excluirRestricao(id: string): Promise<void> {
    return request<void>(`/restricoes/${id}`, { method: 'DELETE', auth: true });
  },
};
