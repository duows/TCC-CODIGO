'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Componente } from '@hardware-csp/shared-types';
import { api } from '@/lib/api';
import { ComponenteForm } from '@/components/admin/componente-form';
import { ErrorBanner } from '@/components/admin/error-banner';

export default function EditarComponentePage() {
  const { categoriaId, id } = useParams<{ categoriaId: string; id: string }>();
  const [componente, setComponente] = useState<(Componente & { id: string }) | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    api
      .buscarComponente(categoriaId, id)
      .then((r) => !cancelado && setComponente(r))
      .catch(() => !cancelado && setErro('Falha ao carregar componente'));
    return () => {
      cancelado = true;
    };
  }, [categoriaId, id]);

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Editar componente</h1>
      <ErrorBanner mensagem={erro} />
      {componente && <ComponenteForm categoriaIdInicial={categoriaId} inicial={componente} />}
    </div>
  );
}
