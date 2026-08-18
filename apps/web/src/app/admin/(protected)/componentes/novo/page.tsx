'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ComponenteForm } from '@/components/admin/componente-form';

function NovoComponentePageInner() {
  const searchParams = useSearchParams();
  const categoriaId = searchParams.get('categoria') ?? '';

  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Novo componente</h1>
      <ComponenteForm categoriaIdInicial={categoriaId} />
    </div>
  );
}

export default function NovoComponentePage() {
  return (
    <Suspense>
      <NovoComponentePageInner />
    </Suspense>
  );
}
