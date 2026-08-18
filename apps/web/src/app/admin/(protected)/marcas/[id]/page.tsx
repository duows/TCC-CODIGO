'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Marca } from '@hardware-csp/shared-types';
import { api } from '@/lib/api';
import { MarcaForm } from '@/components/admin/marca-form';
import { ErrorBanner } from '@/components/admin/error-banner';

export default function EditarMarcaPage() {
  const { id } = useParams<{ id: string }>();
  const [marca, setMarca] = useState<Marca | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarMarcas()
      .then((lista) => {
        if (cancelado) return;
        const encontrada = lista.find((m) => m.id === id);
        if (!encontrada) setErro('Marca não encontrada');
        else setMarca(encontrada);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar marca'));
    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Editar marca</h1>
      <ErrorBanner mensagem={erro} />
      {marca && <MarcaForm inicial={marca} />}
    </div>
  );
}
