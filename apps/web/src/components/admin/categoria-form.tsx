'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoriaInfo } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/admin/error-banner';

export function CategoriaForm({ inicial }: { inicial?: CategoriaInfo }) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [ordem, setOrdem] = useState(inicial?.ordem.toString() ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const dto = { nome, ordem: Number(ordem) };
      if (inicial) {
        await api.atualizarCategoria(inicial.id, dto);
      } else {
        await api.criarCategoria(dto);
      }
      router.push('/admin/categorias');
      router.refresh();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar categoria');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[480px] space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ordem">Ordem no wizard</Label>
        <Input
          id="ordem"
          type="number"
          min={1}
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          required
        />
        <p className="text-[13px] text-[#6E6E73]">
          Define a sequência das etapas do assistente — reordenar categorias existentes muda a
          ordem em que os passos aparecem para o usuário.
        </p>
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando || !nome.trim() || !ordem}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/categorias')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
