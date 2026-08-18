'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Marca } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/admin/error-banner';

export function MarcaForm({ inicial }: { inicial?: Marca }) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      if (inicial) {
        await api.atualizarMarca(inicial.id, { nome });
      } else {
        await api.criarMarca({ nome });
      }
      router.push('/admin/marcas');
      router.refresh();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar marca');
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

      <ErrorBanner mensagem={erro} />

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando || !nome.trim()}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/marcas')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
