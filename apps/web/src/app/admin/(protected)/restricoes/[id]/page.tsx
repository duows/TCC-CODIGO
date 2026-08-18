'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Restricao } from '@hardware-csp/shared-types';
import { api } from '@/lib/api';
import { RestricaoForm } from '@/components/admin/restricao-form';
import { ErrorBanner } from '@/components/admin/error-banner';

export default function EditarRestricaoPage() {
  const { id } = useParams<{ id: string }>();
  const [restricao, setRestricao] = useState<Restricao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .listarRestricoes()
      .then((lista) => {
        if (cancelado) return;
        const encontrada = lista.find((r) => r.id === id);
        if (!encontrada) setErro('Restrição não encontrada');
        else setRestricao(encontrada);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar restrição'));
    return () => {
      cancelado = true;
    };
  }, [id]);

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Editar restrição</h1>
      <ErrorBanner mensagem={erro} />
      {restricao && <RestricaoForm inicial={restricao} />}
    </div>
  );
}
