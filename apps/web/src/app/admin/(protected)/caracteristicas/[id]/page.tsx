'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Caracteristica } from '@hardware-csp/shared-types';
import { api } from '@/lib/api';
import { CaracteristicaForm } from '@/components/admin/caracteristica-form';
import { ErrorBanner } from '@/components/admin/error-banner';

export default function EditarCaracteristicaPage() {
  const { id } = useParams<{ id: string }>();
  const [caracteristica, setCaracteristica] = useState<Caracteristica | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarCaracteristicas()
      .then((lista) => {
        if (cancelado) return;
        const encontrada = lista.find((c) => c.id === id);
        if (!encontrada) setErro('Característica não encontrada');
        else setCaracteristica(encontrada);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar característica'));
    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Editar característica</h1>
      <ErrorBanner mensagem={erro} />
      {caracteristica && <CaracteristicaForm inicial={caracteristica} />}
    </div>
  );
}
