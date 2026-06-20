import type {
  CategoriaInfo,
  Componente,
  EstadoConfiguracao,
  RespostaValidacao,
} from '@hardware-csp/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

/**
 * Cliente HTTP para a API REST do backend.
 *
 * Conforme RNF-11, todas as chamadas são stateless — o estado da configuração
 * é enviado por inteiro a cada requisição.
 */
export const api = {
  async listarCategorias(): Promise<CategoriaInfo[]> {
    const res = await fetch(`${API_URL}/categorias`);
    if (!res.ok) throw new Error('Falha ao listar categorias');
    return res.json();
  },

  async listarComponentes(categoriaId: string): Promise<Componente[]> {
    const res = await fetch(`${API_URL}/components/${categoriaId}`);
    if (!res.ok) throw new Error(`Falha ao listar componentes (${categoriaId})`);
    return res.json();
  },

  async validarConfiguracao(estado: EstadoConfiguracao): Promise<RespostaValidacao> {
    const res = await fetch(`${API_URL}/configurations/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) throw new Error('Falha ao validar configuração');
    return res.json();
  },
};
