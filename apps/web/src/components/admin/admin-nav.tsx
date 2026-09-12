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
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)' }}
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 lg:px-32">
        <div className="flex items-center justify-between gap-4">
          <span className="shrink-0 text-[15px] font-bold text-foreground">Administração</span>
          <button
            onClick={sair}
            className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 sm:hidden"
          >
            Sair
          </button>
        </div>
        <nav className="scrollbar-none flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                pathname?.startsWith(link.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={sair}
          className="hidden shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10 sm:inline-flex"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
