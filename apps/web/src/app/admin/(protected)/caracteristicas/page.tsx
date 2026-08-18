'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Caracteristica, CategoriaInfo } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorBanner } from '@/components/admin/error-banner';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';

export default function CaracteristicasPage() {
  const [caracteristicas, setCaracteristicas] = useState<Caracteristica[]>([]);
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.listarCaracteristicas(), api.listarCategorias()])
      .then(([car, cat]) => {
        if (cancelado) return;
        setCaracteristicas(car);
        setCategorias(cat);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar características'))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  const categoriaNome = (categoriaId: string) =>
    categorias.find((c) => c.id === categoriaId)?.nome ?? categoriaId;

  async function excluir(id: string) {
    setErro(null);
    try {
      await api.excluirCaracteristica(id);
      setCaracteristicas((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao excluir característica');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Características</h1>
        <Button asChild>
          <Link href="/admin/caracteristicas/novo">Nova característica</Link>
        </Button>
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="rounded-2xl border border-[#E5E5EA] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {caracteristicas.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.nome}</TableCell>
                <TableCell>
                  <span className="rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[12px] text-[#6E6E73]">
                    {categoriaNome(c.categoriaId)}
                  </span>
                </TableCell>
                <TableCell>{c.tipo === 'INTEIRO' ? 'Número inteiro' : 'Texto'}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/caracteristicas/${c.id}`}>Editar</Link>
                  </Button>
                  <ConfirmDeleteDialog nome={c.nome} onConfirm={() => excluir(c.id)} />
                </TableCell>
              </TableRow>
            ))}
            {!carregando && caracteristicas.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-[#6E6E73]">
                  Nenhuma característica cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
