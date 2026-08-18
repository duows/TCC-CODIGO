'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { CategoriaInfo } from '@hardware-csp/shared-types';
import { api } from '@/lib/api';
import { CategoriaForm } from '@/components/admin/categoria-form';
import { ErrorBanner } from '@/components/admin/error-banner';

export default function EditarCategoriaPage() {
  const { id } = useParams<{ id: string }>();
  const [categoria, setCategoria] = useState<CategoriaInfo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarCategorias()
      .then((lista) => {
        if (cancelado) return;
        const encontrada = lista.find((c) => c.id === id);
        if (!encontrada) setErro('Categoria não encontrada');
        else setCategoria(encontrada);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar categoria'));
    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Editar categoria</h1>
      <ErrorBanner mensagem={erro} />
      {categoria && <CategoriaForm inicial={categoria} />}
    </div>
  );
}
