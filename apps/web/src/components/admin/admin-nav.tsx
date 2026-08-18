'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin/restricoes', label: 'Restrições' },
  { href: '/admin/componentes', label: 'Componentes' },
  { href: '/admin/caracteristicas', label: 'Características' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/marcas', label: 'Marcas' },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  function sair() {
    clearToken();
    router.replace('/admin/login');
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-[#E5E5EA]"
      style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-32">
        <div className="flex items-center gap-6">
          <span className="text-[15px] font-bold text-[#1D1D1F]">Administração</span>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  pathname?.startsWith(link.href)
                    ? 'bg-blue-50 text-[#007AFF]'
                    : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button
          onClick={sair}
          className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#FF3B30] hover:bg-red-50"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
