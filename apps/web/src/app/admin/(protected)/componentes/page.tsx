'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CategoriaInfo, Componente } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorBanner } from '@/components/admin/error-banner';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';

function ComponentesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriaIdParam = searchParams.get('categoria');

  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarCategorias()
      .then((cats) => {
        if (cancelado) return;
        setCategorias(cats);
        if (!categoriaIdParam && cats.length > 0) {
          router.replace(`/admin/componentes?categoria=${cats[0]!.id}`);
        }
      })
      .catch(() => !cancelado && setErro('Falha ao carregar categorias'));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoriaId = categoriaIdParam ?? categorias[0]?.id ?? '';

  useEffect(() => {
    if (!categoriaId) return;
    let cancelado = false;
    setCarregando(true);
    api
      .listarComponentes(categoriaId)
      .then((r) => !cancelado && setComponentes(r))
      .catch(() => !cancelado && setErro('Falha ao carregar componentes'))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, [categoriaId]);

  async function excluir(id: string) {
    setErro(null);
    try {
      await api.excluirComponente(id);
      setComponentes((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao excluir componente');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Componentes</h1>
        <Button asChild disabled={!categoriaId}>
          <Link href={`/admin/componentes/novo?categoria=${categoriaId}`}>Novo componente</Link>
        </Button>
      </div>

      <div className="max-w-[280px] space-y-1.5">
        <Select
          value={categoriaId}
          onValueChange={(v) => router.replace(`/admin/componentes?categoria=${v}`)}
        >
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
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="rounded-2xl border border-[#E5E5EA] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {componentes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nome}</TableCell>
                <TableCell>{c.marcaNome}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/componentes/${categoriaId}/${c.id}`}>Editar</Link>
                  </Button>
                  <ConfirmDeleteDialog nome={c.nome} onConfirm={() => excluir(c.id)} />
                </TableCell>
              </TableRow>
            ))}
            {!carregando && componentes.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-[#6E6E73]">
                  Nenhum componente cadastrado nesta categoria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ComponentesPage() {
  return (
    <Suspense>
      <ComponentesPageInner />
    </Suspense>
  );
}
