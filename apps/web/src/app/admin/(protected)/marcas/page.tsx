'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Marca } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorBanner } from '@/components/admin/error-banner';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';

export default function MarcasPage() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarMarcas()
      .then((r) => !cancelado && setMarcas(r))
      .catch(() => !cancelado && setErro('Falha ao carregar marcas'))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  async function excluir(id: string) {
    setErro(null);
    try {
      await api.excluirMarca(id);
      setMarcas((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao excluir marca');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Marcas</h1>
        <Button asChild>
          <Link href="/admin/marcas/novo">Nova marca</Link>
        </Button>
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="rounded-2xl border border-[#E5E5EA] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marcas.map((marca) => (
              <TableRow key={marca.id}>
                <TableCell>{marca.nome}</TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/marcas/${marca.id}`}>Editar</Link>
                  </Button>
                  <ConfirmDeleteDialog nome={marca.nome} onConfirm={() => excluir(marca.id)} />
                </TableCell>
              </TableRow>
            ))}
            {!carregando && marcas.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-[#6E6E73]">
                  Nenhuma marca cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
