'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Caracteristica, CategoriaInfo, TipoCaracteristica } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorBanner } from '@/components/admin/error-banner';

export function CaracteristicaForm({ inicial }: { inicial?: Caracteristica }) {
  const router = useRouter();
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [categoriaId, setCategoriaId] = useState(inicial?.categoriaId ?? '');
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [tipo, setTipo] = useState<TipoCaracteristica>(inicial?.tipo ?? 'TEXTO');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarCategorias()
      .then((r) => !cancelado && setCategorias(r))
      .catch(() => !cancelado && setErro('Falha ao carregar categorias'));
    return () => {
      cancelado = true;
    };
  }, []);

  const categoriaAtual = categorias.find((c) => c.id === categoriaId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      if (inicial) {
        await api.atualizarCaracteristica(inicial.id, { nome, tipo });
      } else {
        await api.criarCaracteristica({ categoriaId, nome, tipo });
      }
      router.push('/admin/caracteristicas');
      router.refresh();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar característica');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[480px] space-y-4">
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        {inicial ? (
          <p className="text-[14px] text-[#6E6E73]">
            {categoriaAtual?.nome ?? '...'}{' '}
            <span className="text-[12px]">(não pode ser alterada após a criação)</span>
          </p>
        ) : (
          <Select value={categoriaId} onValueChange={setCategoriaId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCaracteristica)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEXTO">Texto</SelectItem>
            <SelectItem value="INTEIRO">Número inteiro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando || !nome.trim() || (!inicial && !categoriaId)}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/caracteristicas')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
