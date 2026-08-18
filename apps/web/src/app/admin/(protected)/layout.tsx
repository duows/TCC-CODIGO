'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { AdminNav } from '@/components/admin/admin-nav';

/**
 * Este check é só uma conveniência de UX (evita mostrar a tela por um
 * instante antes de redirecionar). A fronteira de segurança real é o
 * backend recusando com 401 qualquer escrita sem um bearer token válido —
 * ver JwtAuthGuard em apps/api/src/auth/jwt-auth.guard.ts.
 */
export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/admin/login');
      return;
    }
    setPronto(true);
  }, [router]);

  if (!pronto) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="size-8 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#007AFF]" />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <AdminNav />
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-32">{children}</main>
    </div>
  );
}
