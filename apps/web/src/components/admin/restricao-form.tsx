'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Caracteristica,
  CategoriaInfo,
  OperadorRestricao,
  Restricao,
} from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorBanner } from '@/components/admin/error-banner';
import { PlaceholderHelp } from '@/components/admin/placeholder-help';

const OPERADORES: { value: OperadorRestricao; label: string }[] = [
  { value: 'IGUAL', label: 'IGUAL' },
  { value: 'MAIOR_OU_IGUAL', label: 'MAIOR_OU_IGUAL' },
];

export function RestricaoForm({ inicial }: { inicial?: Restricao }) {
  const router = useRouter();

  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [caracteristicas, setCaracteristicas] = useState<Caracteristica[]>([]);

  const [caracteristica1Id, setCaracteristica1Id] = useState(inicial?.caracteristica1Id ?? '');
  const [caracteristica2Id, setCaracteristica2Id] = useState(inicial?.caracteristica2Id ?? '');
  const [operador, setOperador] = useState<OperadorRestricao>(inicial?.operador ?? 'IGUAL');
  const [parametro, setParametro] = useState(inicial?.parametro ?? '');
  const [templateJustificativa, setTemplateJustificativa] = useState(
    inicial?.templateJustificativa ?? '',
  );

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.listarCategorias(), api.listarCaracteristicas()])
      .then(([cat, car]) => {
        if (cancelado) return;
        setCategorias(cat);
        setCaracteristicas(car);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar categorias/características'));
    return () => {
      cancelado = true;
    };
  }, []);

  const categoriaNome = (categoriaId: string) =>
    categorias.find((c) => c.id === categoriaId)?.nome ?? categoriaId;

  const car1 = caracteristicas.find((c) => c.id === caracteristica1Id);
  const car2 = caracteristicas.find((c) => c.id === caracteristica2Id);
  const mesmaCategoria =
    car1 && car2 && car1.categoriaId === car2.categoriaId ? true : false;

  const categoriasComCaracteristicas = categorias
    .map((cat) => ({ categoria: cat, itens: caracteristicas.filter((c) => c.categoriaId === cat.id) }))
    .filter((g) => g.itens.length > 0);

  function handleOperadorChange(novo: OperadorRestricao) {
    setOperador(novo);
    if (novo === 'IGUAL') setParametro('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const dto = {
        caracteristica1Id,
        caracteristica2Id,
        operador,
        parametro: operador === 'MAIOR_OU_IGUAL' ? parametro : null,
        templateJustificativa,
      };
      if (inicial) {
        await api.atualizarRestricao(inicial.id, dto);
      } else {
        await api.criarRestricao(dto);
      }
      router.push('/admin/restricoes');
      router.refresh();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar restrição');
    } finally {
      setSalvando(false);
    }
  }

  function renderSelectCaracteristica(
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
  ) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {categoriasComCaracteristicas.map(({ categoria, itens }) => (
            <SelectGroup key={categoria.id}>
              <SelectLabel>{categoria.nome}</SelectLabel>
              {itens.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const valido =
    !!caracteristica1Id &&
    !!caracteristica2Id &&
    !mesmaCategoria &&
    templateJustificativa.trim() !== '' &&
    (operador !== 'MAIOR_OU_IGUAL' || parametro.trim() !== '');

  return (
    <form onSubmit={handleSubmit} className="max-w-[640px] space-y-5">
      <div
        className={cn(
          'rounded-xl border px-4 py-3 text-[13px] leading-relaxed',
          operador === 'MAIOR_OU_IGUAL'
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-[#E5E5EA] bg-[#F5F5F7] text-[#6E6E73]',
        )}
      >
        Em restrições <strong>MAIOR_OU_IGUAL</strong>, Característica 1 é sempre o lado da{' '}
        <strong>DEMANDA</strong> e Característica 2 é sempre o lado da <strong>CAPACIDADE</strong>{' '}
        (ex.: TDP da CPU × margem ≤ Potência da Fonte). Invertê-las produz uma validação incorreta
        que não é detectada automaticamente pelo motor.
      </div>

      <div className="space-y-1.5">
        <Label>Característica 1 — Demanda / Consumo</Label>
        {renderSelectCaracteristica(caracteristica1Id, setCaracteristica1Id, 'Selecione a característica 1')}
        {car1 && <p className="text-[12px] text-[#6E6E73]">pertence a: {categoriaNome(car1.categoriaId)}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Característica 2 — Capacidade / Oferta</Label>
        {renderSelectCaracteristica(caracteristica2Id, setCaracteristica2Id, 'Selecione a característica 2')}
        {car2 && <p className="text-[12px] text-[#6E6E73]">pertence a: {categoriaNome(car2.categoriaId)}</p>}
      </div>

      {mesmaCategoria && (
        <ErrorBanner mensagem="As duas características pertencem à mesma categoria — o backend rejeitará este cadastro." />
      )}

      <div className="space-y-1.5">
        <Label>Operador</Label>
        <Select value={operador} onValueChange={(v) => handleOperadorChange(v as OperadorRestricao)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERADORES.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {operador === 'MAIOR_OU_IGUAL' && (
        <div className="space-y-1.5">
          <Label htmlFor="parametro">Parametro</Label>
          <Input
            id="parametro"
            value={parametro}
            onChange={(e) => setParametro(e.target.value)}
            placeholder="1.25"
            required
          />
          <p className="text-[12px] text-[#6E6E73]">
            Fator multiplicador sobre o valor de Característica 1 (ex.: 1.25 = 25% de margem).
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="template">Justificativa (template)</Label>
        <Textarea
          id="template"
          value={templateJustificativa}
          onChange={(e) => setTemplateJustificativa(e.target.value)}
          rows={3}
          required
        />
        <PlaceholderHelp
          template={templateJustificativa}
          parametro={parametro}
          mostrarMargem={operador === 'MAIOR_OU_IGUAL'}
        />
      </div>

      <ErrorBanner mensagem={erro} />

      <div className="flex gap-2">
        <Button type="submit" disabled={salvando || !valido}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/admin/restricoes')}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
