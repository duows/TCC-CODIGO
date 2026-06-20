'use client';

import { useState, useEffect } from 'react';
import {
  Lock,
  Check,
  X,
  Cpu,
  MemoryStick,
  CircuitBoard,
  Monitor,
  HardDrive,
  Zap,
  Wind,
  Package,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type {
  CategoriaInfo,
  EstadoConfiguracao,
  RespostaValidacao,
  Componente,
  JustificativaEducativa,
} from '@hardware-csp/shared-types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

// ── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryIcon(nome: string) {
  const n = nome.toLowerCase();
  if (n.includes('cpu') || n.includes('processador')) return Cpu;
  if (n.includes('mem') || n.includes('ram')) return MemoryStick;
  if (n.includes('placa-m') || n.includes('placa m') || n.includes('mother')) return CircuitBoard;
  if (n.includes('gpu') || n.includes('vídeo') || n.includes('video')) return Monitor;
  if (n.includes('ssd') || n.includes('hd') || n.includes('armazen')) return HardDrive;
  if (n.includes('fonte') || n.includes('psu')) return Zap;
  if (n.includes('cooler') || n.includes('resfri')) return Wind;
  return Package;
}

function getButtonLabel(catNome: string) {
  const n = catNome.toLowerCase();
  if (n.includes('cpu') || n.includes('processador')) return 'Escolher processador';
  if (n.includes('placa')) return 'Escolher placa-mãe';
  if (n.includes('mem') || n.includes('ram')) return 'Escolher memória';
  if (n.includes('gpu') || n.includes('vídeo')) return 'Escolher GPU';
  if (n.includes('fonte') || n.includes('psu')) return 'Escolher fonte';
  return `Escolher ${catNome.toLowerCase()}`;
}

const BRAND_COLORS: Record<string, { bg: string; text: string }> = {
  intel:         { bg: '#EBF3FF', text: '#0062B8' },
  amd:           { bg: '#FFF0F0', text: '#C41A1A' },
  nvidia:        { bg: '#F0FBE8', text: '#4A7A00' },
  asus:          { bg: '#F5F5F5', text: '#404040' },
  msi:           { bg: '#FFF0F0', text: '#B01020' },
  gigabyte:      { bg: '#EBF3FF', text: '#0050A0' },
  asrock:        { bg: '#FFF5EB', text: '#B85000' },
  corsair:       { bg: '#FFFAE8', text: '#A07000' },
  'g.skill':     { bg: '#FFF0F0', text: '#AA1020' },
  kingston:      { bg: '#FFF0F0', text: '#CC0000' },
  seasonic:      { bg: '#FFF5EB', text: '#B86000' },
  evga:          { bg: '#F5F5F5', text: '#444444' },
  'cooler master': { bg: '#EBF3FF', text: '#004BAA' },
  'be quiet!':   { bg: '#F5F5F5', text: '#2A2A2A' },
};

function getBrandColors(brand: string) {
  return BRAND_COLORS[brand.toLowerCase()] ?? { bg: '#F5F5F5', text: '#555555' };
}

// ── ResumoPanel ──────────────────────────────────────────────────────────────

interface ResumoPanelProps {
  categorias: CategoriaInfo[];
  estado: EstadoConfiguracao;
  catalogoTotal: Map<string, Componente>;
  incompativeisIds: Set<string>;
}

/**
 * Nome da característica de consumo (em Watts) como vem do dado EAV (RF-16).
 * Não há categoria fixa com consumo: somamos a característica de TODO componente
 * selecionado que a possua; componentes sem ela simplesmente não contribuem.
 */
const CARACTERISTICA_CONSUMO = 'tdp';

function ResumoPanel({ categorias, estado, catalogoTotal, incompativeisIds }: ResumoPanelProps) {
  const selectionCount = categorias.filter((cat) => estado[cat.id] !== undefined).length;

  // RF-16: consumo total estimado = somatório do TDP (W) dos selecionados.
  const consumoTotalW = categorias.reduce((soma, cat) => {
    const compId = estado[cat.id];
    const comp = compId !== undefined ? catalogoTotal.get(compId) : undefined;
    if (!comp) return soma;
    const carConsumo = comp.caracteristicas.find(
      (c) => c.nome.toLowerCase() === CARACTERISTICA_CONSUMO,
    );
    const watts = carConsumo ? Number(carConsumo.valor) : NaN;
    return Number.isFinite(watts) ? soma + watts : soma;
  }, 0);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
        <h3 className="text-[15px] font-bold tracking-tight text-[#1D1D1F]">Resumo da Build</h3>
        <span className="text-[11px] font-semibold text-[#6E6E73] bg-[#F5F5F7] border border-[#E5E5EA] px-2.5 py-1 rounded-full">
          {selectionCount} de {categorias.length}
        </span>
      </div>

      {/* Items */}
      <div>
        {categorias.map((cat, i) => {
          const compId = estado[cat.id];
          const comp = compId !== undefined ? catalogoTotal.get(compId) : undefined;
          const Icon = getCategoryIcon(cat.nome);
          const hasComp = !!comp;

          const isIncompat = hasComp && incompativeisIds.has(cat.id);
          return (
            <div
              key={cat.id}
              className={cn(
                'flex items-center gap-3 px-5 py-3 transition-colors',
                i > 0 && 'border-t border-[#F2F2F7]',
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border',
                  isIncompat
                    ? 'bg-red-50 border-red-100'
                    : hasComp
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-[#F5F5F7] border-[#E5E5EA]',
                )}
              >
                <Icon
                  size={15}
                  className={isIncompat ? 'text-[#FF3B30]' : hasComp ? 'text-[#007AFF]' : 'text-[#AEAEB2]'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#AEAEB2]">
                  {cat.nome}
                </p>
                <p
                  className={cn(
                    'text-[13px] font-medium truncate mt-0.5',
                    isIncompat ? 'text-[#FF3B30]' : hasComp ? 'text-[#1D1D1F]' : 'text-[#C7C7CC]',
                  )}
                >
                  {comp?.nome ?? 'Não selecionado'}
                </p>
              </div>
              <div
                className={cn(
                  'w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold',
                  isIncompat
                    ? 'bg-red-100 text-[#FF3B30]'
                    : hasComp
                      ? 'bg-green-100 text-[#34C759]'
                      : 'bg-[#F5F5F7] text-[#D1D1D6]',
                )}
              >
                {isIncompat ? (
                  <X size={12} strokeWidth={2.5} />
                ) : hasComp ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  '–'
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-[#E5E5EA]">
        <span className="text-[13px] font-medium text-[#6E6E73]">Consumo estimado</span>
        <span className="text-[20px] font-bold tracking-tight text-[#1D1D1F]">
          {selectionCount === 0 ? '—' : `${consumoTotalW} W`}
        </span>
      </div>
    </div>
  );
}

// ── ComponentCard ────────────────────────────────────────────────────────────

interface ComponentCardProps {
  comp: Componente;
  isSelected: boolean;
  justificativas?: JustificativaEducativa[];
  onSelect: (id: string) => void;
  buttonLabel: string;
}

function ComponentCard({ comp, isSelected, justificativas, onSelect, buttonLabel }: ComponentCardProps) {
  const isBlocked = justificativas !== undefined && justificativas.length > 0;
  const brand = getBrandColors(comp.marcaNome);

  // 4 visual states:
  // selected-invalid: user selected this component but AC-3 flagged it as incompatible
  // selected-valid:   selected and compatible
  // blocked:          not selected but incompatible with current selections (still clickable)
  // available:        not selected, compatible
  const state =
    isSelected && isBlocked ? 'selected-invalid'
    : isSelected ? 'selected-valid'
    : isBlocked ? 'blocked'
    : 'available';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(comp.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(comp.id);
        }
      }}
      className="focus:outline-none"
    >
      <div
        className={cn(
          'relative bg-white rounded-2xl border-[1.5px] flex flex-col transition-all duration-200 overflow-hidden cursor-pointer',
          state === 'selected-invalid'
            ? 'border-[#FF3B30] shadow-[0_0_0_3px_rgba(255,59,48,0.12),0_4px_16px_rgba(0,0,0,0.08)]'
            : state === 'selected-valid'
              ? 'border-[#007AFF] shadow-[0_0_0_3px_rgba(0,122,255,0.12),0_4px_16px_rgba(0,0,0,0.08)]'
              : state === 'blocked'
                ? 'border-red-100 hover:border-[#007AFF] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                : 'border-[#E5E5EA] hover:border-[#007AFF] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]',
        )}
      >
        {state === 'selected-valid' && (
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#007AFF]" />
        )}
        {state === 'selected-invalid' && (
          <div className="absolute inset-x-0 top-0 h-[3px] bg-[#FF3B30]" />
        )}

        <div className="p-5 flex flex-col gap-3 flex-1">
          <div className="flex items-start justify-between gap-2 pt-1">
            <h4 className="text-[14px] font-semibold leading-snug text-[#1D1D1F]">{comp.nome}</h4>
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 leading-none"
              style={{ background: brand.bg, color: brand.text }}
            >
              {comp.marcaNome}
            </span>
          </div>

          {comp.caracteristicas.length > 0 && (
            <div className="flex flex-col gap-[7px]">
              {comp.caracteristicas.slice(0, 4).map((car) => (
                <div key={car.caracteristicaId} className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#AEAEB2] font-medium">{car.nome}</span>
                  <span className="text-[11px] text-[#6E6E73] font-semibold text-right">{car.valor}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-[#F2F2F7] flex items-center justify-between gap-2">
          {/* Primary action badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-full border',
              state === 'selected-invalid'
                ? 'bg-red-50 border-[#FFCCC9] text-[#FF3B30]'
                : state === 'selected-valid'
                  ? 'bg-[#34C759] border-[#34C759] text-white'
                  : 'bg-[#F5F5F7] border-[#E5E5EA] text-[#6E6E73] hover:border-[#007AFF] hover:text-[#007AFF] hover:bg-blue-50 transition-all duration-150',
            )}
          >
            {state === 'selected-invalid' && <X size={11} strokeWidth={2.5} />}
            {state === 'selected-valid' && <Check size={11} strokeWidth={2.5} />}
            {state === 'selected-invalid'
              ? 'Incompatível'
              : state === 'selected-valid'
                ? 'Selecionado'
                : buttonLabel}
          </div>

          {/* Explanation popover — visible for any blocked state (selected or not) */}
          {isBlocked && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 border border-[#FFCCC9] text-[#FF3B30] hover:bg-red-100 transition-colors flex-shrink-0"
                  title="Ver motivo da incompatibilidade"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                className="max-w-[300px] p-3 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl"
              >
                <div className="flex flex-col gap-2">
                  {justificativas!.map((j, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Lock size={13} className="text-[#FF3B30]" />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-[#FF3B30] mb-1">Restrição violada</p>
                        <p className="text-[12px] text-[#6E6E73] leading-relaxed">{j.mensagem}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WizardPage ───────────────────────────────────────────────────────────────

export default function WizardPage() {
  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [etapa, setEtapa] = useState(0);
  const [estado, setEstado] = useState<EstadoConfiguracao>({});
  const [validacao, setValidacao] = useState<RespostaValidacao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [catalogoTotal, setCatalogoTotal] = useState<Map<string, Componente>>(new Map());

  const categoriaAtual: CategoriaInfo | undefined = categorias[etapa];
  const modoResumo = categorias.length > 0 && etapa >= categorias.length;
  const progresso = categorias.length > 0 ? (etapa / categorias.length) * 100 : 0;

  useEffect(() => {
    api
      .listarCategorias()
      .then(setCategorias)
      .catch((e) => console.error('Erro ao listar categorias:', e));
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    api
      .validarConfiguracao(estado)
      .then((r) => { if (!cancelado) setValidacao(r); })
      .catch((e) => console.error('Erro na validação:', e))
      .finally(() => { if (!cancelado) setCarregando(false); });
    return () => { cancelado = true; };
  }, [estado]);

  useEffect(() => {
    if (!categoriaAtual) return;
    let cancelado = false;
    setComponentes([]);
    api
      .listarComponentes(categoriaAtual.id)
      .then((lista) => {
        if (cancelado) return;
        setComponentes(lista);
        setCatalogoTotal((prev) => {
          const next = new Map(prev);
          lista.forEach((c) => next.set(c.id, c));
          return next;
        });
      })
      .catch((e) => console.error('Erro ao listar componentes:', e));
    return () => { cancelado = true; };
  }, [categoriaAtual]);

  const dominioAtual = validacao?.dominios.find((d) => d.categoriaId === categoriaAtual?.id);
  const blockedMap = new Map<string, JustificativaEducativa[]>();
  for (const b of dominioAtual?.valoresBloqueados ?? []) {
    const existing = blockedMap.get(b.componenteId);
    if (existing) { existing.push(b.justificativa); }
    else { blockedMap.set(b.componenteId, [b.justificativa]); }
  }

  // For each category, check if the selected component is blocked (selected-invalid state).
  // Used by the sidebar ResumoPanel and the summary screen.
  const incompativeisIds = new Set<string>();
  const incompativeisJustificativas = new Map<string, JustificativaEducativa[]>();
  if (validacao) {
    for (const dominio of validacao.dominios) {
      const selectedId = estado[dominio.categoriaId];
      if (selectedId !== undefined) {
        const bloqueios = dominio.valoresBloqueados.filter((b) => b.componenteId === selectedId);
        if (bloqueios.length > 0) {
          incompativeisIds.add(dominio.categoriaId);
          incompativeisJustificativas.set(dominio.categoriaId, bloqueios.map((b) => b.justificativa));
        }
      }
    }
  }

  function selecionar(componenteId: string) {
    if (!categoriaAtual) return;
    setEstado((prev) => {
      const next = { ...prev };
      if (next[categoriaAtual.id] === componenteId) {
        delete next[categoriaAtual.id];
      } else {
        next[categoriaAtual.id] = componenteId;
      }
      return next;
    });
  }

  function avancar() {
    if (etapa <= categorias.length) setEtapa(etapa + 1);
  }

  function voltar() {
    if (etapa > 0) setEtapa(etapa - 1);
  }

  function reiniciar() {
    setEstado({});
    setEtapa(0);
    setComponentes([]);
    setCatalogoTotal(new Map());
  }

  // Loading state
  if (categorias.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#6E6E73]">
          <div className="w-5 h-5 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[15px] font-medium">Carregando…</span>
        </div>
      </div>
    );
  }

  const btnLabel = getButtonLabel(categoriaAtual?.nome ?? '');

  return (
    <div
      className="min-h-screen bg-[#F5F5F7]"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif' }}
    >
      {/* ── STICKY HEADER ─────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 border-b border-[#E5E5EA]"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-32 pt-5 pb-0">
          {/* Title row */}
          <div className="flex items-start justify-between mb-4 gap-2 flex-wrap">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-[#1D1D1F]">
                Configuração de Hardware
              </h1>
              <p className="text-[13px] text-[#6E6E73] mt-0.5">
                Monte sua build — cada etapa valida compatibilidade em tempo real
              </p>
            </div>
            <span className="text-[12px] font-medium text-[#AEAEB2] mt-1 whitespace-nowrap shrink-0">
              {modoResumo ? 'Resumo final' : `Etapa ${etapa + 1} de ${categorias.length}`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-[3px] bg-[#E5E5EA] rounded-full mb-4">
            <div
              className="h-full bg-[#007AFF] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${modoResumo ? 100 : progresso}%` }}
            />
          </div>

          {/* Step tabs */}
          <nav className="flex scrollbar-none overflow-x-auto">
            {categorias.map((cat, i) => {
              const isActive = i === etapa && !modoResumo;
              const isCompleted = estado[cat.id] !== undefined;
              const isPast = i < etapa;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { if (isPast || isCompleted) setEtapa(i); }}
                  disabled={!isPast && !isCompleted && !isActive}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-all duration-200 relative top-px',
                    isActive
                      ? 'text-[#007AFF] border-[#007AFF] font-semibold'
                      : isCompleted
                        ? 'text-[#34C759] border-transparent hover:text-[#1D1D1F] cursor-pointer'
                        : 'text-[#AEAEB2] border-transparent cursor-default',
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                      isActive
                        ? 'bg-[#007AFF] text-white'
                        : isCompleted
                          ? 'bg-[#34C759] text-white'
                          : 'bg-[#E5E5EA] text-[#AEAEB2]',
                    )}
                  >
                    {isCompleted && !isActive ? <Check size={10} strokeWidth={3} /> : i + 1}
                  </span>
                  {cat.nome}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      {modoResumo ? (
        /* Summary screen */
        <div className="px-4 sm:px-6 lg:px-32 py-8 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-[28px] font-bold tracking-tight text-[#1D1D1F]">
              Resumo da Configuração
            </h2>
            {validacao?.consistente ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#34C759] bg-green-50 border border-green-200 px-3 py-1 rounded-full">
                <Check size={12} strokeWidth={2.5} />
                Configuração compatível
              </span>
            ) : (
              <span className="text-[12px] font-semibold text-[#FF3B30] bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                Inconsistências detectadas
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
            {categorias.map((cat) => {
              const componenteId = estado[cat.id];
              const componente = componenteId !== undefined ? catalogoTotal.get(componenteId) : undefined;
              const Icon = getCategoryIcon(cat.nome);
              const isIncompat = incompativeisIds.has(cat.id);
              const justificativasResumo = incompativeisJustificativas.get(cat.id) ?? [];
              return (
                <div
                  key={cat.id}
                  className={cn(
                    'bg-white rounded-2xl border p-5 shadow-sm',
                    isIncompat ? 'border-red-200' : 'border-[#E5E5EA]',
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border',
                        isIncompat
                          ? 'bg-red-50 border-red-100'
                          : componente
                            ? 'bg-blue-50 border-blue-100'
                            : 'bg-[#F5F5F7] border-[#E5E5EA]',
                      )}
                    >
                      <Icon
                        size={18}
                        className={isIncompat ? 'text-[#FF3B30]' : componente ? 'text-[#007AFF]' : 'text-[#AEAEB2]'}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#AEAEB2]">
                        {cat.nome}
                      </p>
                      <p
                        className={cn(
                          'text-[15px] font-semibold mt-0.5',
                          isIncompat ? 'text-[#FF3B30]' : componente ? 'text-[#1D1D1F]' : 'text-[#C7C7CC]',
                        )}
                      >
                        {componente?.nome ?? '—'}
                      </p>
                    </div>
                    {componente && (
                      <div
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                          isIncompat ? 'bg-red-100 text-[#FF3B30]' : 'bg-green-100 text-[#34C759]',
                        )}
                      >
                        {isIncompat ? (
                          <X size={12} strokeWidth={2.5} />
                        ) : (
                          <Check size={12} strokeWidth={2.5} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Constraint violation reasons (may be multiple for the same component) */}
                  {isIncompat && justificativasResumo.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                      {justificativasResumo.map((j, idx) => (
                        <div key={idx} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                          <Lock size={12} className="text-[#FF3B30] mt-0.5 flex-shrink-0" />
                          <p className="text-[12px] text-[#C41A1A] leading-relaxed">
                            {j.mensagem}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {componente && componente.caracteristicas.length > 0 && (
                    <div className="border-t border-[#F2F2F7] pt-3 flex flex-wrap gap-1.5">
                      {componente.caracteristicas.slice(0, 4).map((car) => (
                        <span
                          key={car.caracteristicaId}
                          className={cn(
                            'text-[11px] font-medium px-2 py-0.5 rounded-full border',
                            isIncompat
                              ? 'text-[#C41A1A] bg-red-50 border-red-100'
                              : 'text-[#6E6E73] bg-[#F5F5F7] border-[#E5E5EA]',
                          )}
                        >
                          {car.nome}: {car.valor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {validacao && (
            <p className="mt-5 text-[12px] text-[#AEAEB2]">
              Validado em {validacao.tempoExecucaoMs} ms via AC-3
            </p>
          )}

          <div className="flex items-center justify-between pt-8 mt-8 border-t border-[#E5E5EA]">
            <button
              onClick={voltar}
              className="text-[15px] font-semibold border-[1.5px] border-[#E5E5EA] rounded-xl px-6 py-2.5 text-[#6E6E73] hover:border-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
            >
              VOLTAR
            </button>
            <button
              onClick={reiniciar}
              className="flex items-center gap-2 text-[15px] font-semibold text-[#FF3B30] hover:bg-red-50 px-5 py-2.5 rounded-xl active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] focus-visible:ring-offset-2"
            >
              <RotateCcw size={14} />
              REINICIAR
            </button>
          </div>
        </div>
      ) : (
        /* Wizard step */
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 px-4 sm:px-6 lg:px-32 py-8 max-w-[1440px] mx-auto items-start"
        >
          {/* ── Main column ─────────────────────────────────────────────── */}
          <main>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-[28px] font-bold tracking-tight text-[#1D1D1F]">
                {categoriaAtual?.nome}
              </h2>
              {carregando && (
                <div className="flex items-center gap-2 text-[#AEAEB2]">
                  <div className="w-4 h-4 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[12px] font-medium">Validando…</span>
                </div>
              )}
            </div>

            {/* Component grid */}
            <div key={etapa} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
              {componentes.length === 0
                ? [1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-[230px] rounded-2xl bg-[#E5E5EA] animate-pulse"
                    />
                  ))
                : componentes.map((comp) => {
                    const isSelected =
                      categoriaAtual !== undefined && estado[categoriaAtual.id] === comp.id;
                    const justificativas = blockedMap.get(comp.id);
                    return (
                      <ComponentCard
                        key={comp.id}
                        comp={comp}
                        isSelected={isSelected}
                        justificativas={justificativas}
                        onSelect={selecionar}
                        buttonLabel={btnLabel}
                      />
                    );
                  })}
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between pt-8 mt-8 border-t border-[#E5E5EA]">
              <button
                onClick={voltar}
                className={cn(
                  'text-[15px] font-semibold border-[1.5px] border-[#E5E5EA] rounded-xl px-6 py-2.5',
                  'transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2',
                  etapa === 0
                    ? 'invisible'
                    : 'text-[#6E6E73] hover:border-[#AEAEB2] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] active:scale-[0.98]',
                )}
              >
                VOLTAR
              </button>

              <button
                onClick={reiniciar}
                className="flex items-center gap-2 text-[15px] font-semibold text-[#FF3B30] hover:bg-red-50 px-5 py-2.5 rounded-xl active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] focus-visible:ring-offset-2"
              >
                <RotateCcw size={14} />
                REINICIAR
              </button>

              <button
                onClick={avancar}
                className="flex items-center gap-2 text-[15px] font-semibold text-white px-7 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066DD] active:scale-[0.98] shadow-[0_2px_8px_rgba(0,122,255,0.28)] hover:shadow-[0_4px_12px_rgba(0,122,255,0.35)] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
              >
                {etapa >= categorias.length - 1 ? (
                  <>
                    <Check size={15} strokeWidth={2.5} />
                    FINALIZAR
                  </>
                ) : (
                  <>
                    PRÓXIMO
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </main>

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-[168px] flex flex-col gap-4">
            <ResumoPanel
              categorias={categorias}
              estado={estado}
              catalogoTotal={catalogoTotal}
              incompativeisIds={incompativeisIds}
            />

            {/* Placeholder — future build analysis */}
            <div className="bg-white border-[1.5px] border-dashed border-[#D1D1D6] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#AEAEB2"
                  strokeWidth="2"
                >
                  <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-[#1D1D1F] mb-1.5">Análise da Build</p>
              <p className="text-[12px] text-[#AEAEB2] leading-relaxed">
                O relatório de compatibilidade detalhado e restrições CSP aparecerão aqui.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
