import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex-1 flex items-center justify-center bg-white relative overflow-hidden">
      {/* Subtle dot-grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,122,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Blue radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 700,
          height: 700,
          background: 'radial-gradient(circle, rgba(0,122,255,0.05) 0%, transparent 70%)',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div className="text-center max-w-[560px] px-8 py-12 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#007AFF] border border-blue-100 text-[11px] font-bold tracking-[0.06em] uppercase px-3 py-1.5 rounded-full mb-7">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          CSP · Verificação em Tempo Real
        </div>

        {/* Title */}
        <h1
          className="text-[42px] font-bold leading-[1.08] text-[#1D1D1F] mb-5"
          style={{ letterSpacing: '-0.03em' }}
        >
          Sistema Especialista de{' '}
          <span className="text-[#007AFF]">Compatibilidade</span> de Hardware
        </h1>

        {/* Description */}
        <p className="text-[17px] leading-[1.65] text-[#6E6E73] mb-10">
          Monte um computador desktop com validação automática de compatibilidade baseada em{' '}
          <strong className="font-semibold text-[#1D1D1F]">
            Problema de Satisfação de Restrições (CSP)
          </strong>
          . Cada bloqueio vem acompanhado da explicação técnica da regra física violada.
        </p>

        {/* CTA */}
        <Link
          href="/wizard"
          className="inline-flex items-center gap-2 px-7 py-[14px] rounded-xl font-semibold text-[17px] text-white bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(0,122,255,0.32)] hover:shadow-[0_6px_20px_rgba(0,122,255,0.40)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
          style={{ letterSpacing: '-0.01em' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          Iniciar Configuração
        </Link>

        {/* Feature chips */}
        <div className="flex items-center justify-center gap-8 mt-12">
          {[
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              label: 'Validação CSP',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
              label: 'Tempo Real',
            },
            {
              icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                  <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
                </svg>
              ),
              label: '5 Categorias',
            },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl flex items-center justify-center">
                {icon}
              </div>
              <span className="text-[11px] font-medium text-[#6E6E73]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
