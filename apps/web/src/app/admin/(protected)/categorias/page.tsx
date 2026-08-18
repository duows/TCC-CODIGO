'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CategoriaInfo } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorBanner } from '@/components/admin/error-banner';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarCategorias()
      .then((r) => !cancelado && setCategorias(r))
      .catch(() => !cancelado && setErro('Falha ao carregar categorias'))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  async function excluir(id: string) {
    setErro(null);
    try {
      await api.excluirCategoria(id);
      setCategorias((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao excluir categoria');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Categorias</h1>
        <Button asChild>
          <Link href="/admin/categorias/novo">Nova categoria</Link>
        </Button>
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="rounded-2xl border border-[#E5E5EA] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categorias.map((categoria) => (
              <TableRow key={categoria.id}>
                <TableCell>{categoria.nome}</TableCell>
                <TableCell>{categoria.ordem}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/categorias/${categoria.id}`}>Editar</Link>
                  </Button>
                  <ConfirmDeleteDialog nome={categoria.nome} onConfirm={() => excluir(categoria.id)} />
                </TableCell>
              </TableRow>
            ))}
            {!carregando && categorias.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-[#6E6E73]">
                  Nenhuma categoria cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
