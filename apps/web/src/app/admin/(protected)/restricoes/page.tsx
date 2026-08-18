'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Caracteristica, CategoriaInfo, Restricao } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorBanner } from '@/components/admin/error-banner';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';

export default function RestricoesPage() {
  const [restricoes, setRestricoes] = useState<Restricao[]>([]);
  const [caracteristicas, setCaracteristicas] = useState<Caracteristica[]>([]);
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.listarRestricoes(), api.listarCaracteristicas(), api.listarCategorias()])
      .then(([res, car, cat]) => {
        if (cancelado) return;
        setRestricoes(res);
        setCaracteristicas(car);
        setCategorias(cat);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar restrições'))
      .finally(() => !cancelado && setCarregando(false));
    return () => {
      cancelado = true;
    };
  }, []);

  function infoCaracteristica(id: string) {
    const c = caracteristicas.find((car) => car.id === id);
    if (!c) return { nome: id, categoriaNome: '' };
    return { nome: c.nome, categoriaNome: categorias.find((cat) => cat.id === c.categoriaId)?.nome ?? '' };
  }

  async function excluir(id: string) {
    setErro(null);
    try {
      await api.excluirRestricao(id);
      setRestricoes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao excluir restrição');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1D1D1F]">Restrições</h1>
        <Button asChild>
          <Link href="/admin/restricoes/novo">Nova restrição</Link>
        </Button>
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="rounded-2xl border border-[#E5E5EA] bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Característica 1 (demanda)</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Característica 2 (capacidade)</TableHead>
              <TableHead>Parametro</TableHead>
              <TableHead className="w-[160px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restricoes.map((r) => {
              const c1 = infoCaracteristica(r.caracteristica1Id);
              const c2 = infoCaracteristica(r.caracteristica2Id);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    {c1.nome}{' '}
                    <span className="ml-1 rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[11px] text-[#6E6E73]">
                      {c1.categoriaNome}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="text-[12px]">{r.operador}</code>
                  </TableCell>
                  <TableCell>
                    {c2.nome}{' '}
                    <span className="ml-1 rounded-full bg-[#F5F5F7] px-2 py-0.5 text-[11px] text-[#6E6E73]">
                      {c2.categoriaNome}
                    </span>
                  </TableCell>
                  <TableCell>{r.parametro ?? '—'}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/restricoes/${r.id}`}>Editar</Link>
                    </Button>
                    <ConfirmDeleteDialog nome={`${c1.nome} × ${c2.nome}`} onConfirm={() => excluir(r.id)} />
                  </TableCell>
                </TableRow>
              );
            })}
            {!carregando && restricoes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-[#6E6E73]">
                  Nenhuma restrição cadastrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
