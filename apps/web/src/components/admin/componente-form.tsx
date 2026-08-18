'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Caracteristica, CategoriaInfo, Componente, Marca } from '@hardware-csp/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ErrorBanner } from '@/components/admin/error-banner';

export function ComponenteForm({
  categoriaIdInicial,
  inicial,
}: {
  categoriaIdInicial: string;
  /** Presente apenas em modo edição — inclui id, nome, marca e valores atuais. */
  inicial?: Componente & { id: string };
}) {
  const router = useRouter();
  const emEdicao = Boolean(inicial);

  const [categorias, setCategorias] = useState<CategoriaInfo[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [todasCaracteristicas, setTodasCaracteristicas] = useState<Caracteristica[]>([]);

  const [categoriaId, setCategoriaId] = useState(categoriaIdInicial);
  const [marcaId, setMarcaId] = useState('');
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [valores, setValores] = useState<Record<string, string>>({});
  const [avisoTrocaCategoria, setAvisoTrocaCategoria] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    Promise.all([api.listarCategorias(), api.listarMarcas(), api.listarCaracteristicas()])
      .then(([cat, mar, car]) => {
        if (cancelado) return;
        setCategorias(cat);
        setMarcas(mar);
        setTodasCaracteristicas(car);
      })
      .catch(() => !cancelado && setErro('Falha ao carregar categorias/marcas/características'));
    return () => {
      cancelado = true;
    };
  }, []);

  // Pré-preenche marcaId e valores assim que os dados do componente (edição)
  // e a lista de marcas estiverem disponíveis.
  useEffect(() => {
    if (!inicial || marcas.length === 0) return;
    const marcaAtual = marcas.find((m) => m.nome === inicial.marcaNome);
    if (marcaAtual) setMarcaId(marcaAtual.id);
    const valoresIniciais: Record<string, string> = {};
    for (const c of inicial.caracteristicas) valoresIniciais[c.caracteristicaId] = c.valor;
    setValores(valoresIniciais);
  }, [inicial, marcas]);

  const caracteristicasDaCategoria = todasCaracteristicas.filter((c) => c.categoriaId === categoriaId);

  function handleCategoriaChange(novaCategoriaId: string) {
    setCategoriaId(novaCategoriaId);
    setValores({});
    setAvisoTrocaCategoria(true);
  }

  function handleValorChange(caracteristicaId: string, valor: string) {
    setValores((prev) => ({ ...prev, [caracteristicaId]: valor }));
  }

  const valoresCompletos = caracteristicasDaCategoria.every((c) => (valores[c.id] ?? '').trim() !== '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const dto = {
        nome,
        marcaId,
        categoriaId,
        caracteristicas: caracteristicasDaCategoria.map((c) => ({
          caracteristicaId: c.id,
          valor: valores[c.id] ?? '',
        })),
      };
      if (inicial) {
        await api.atualizarComponente(inicial.id, dto);
      } else {
        await api.criarComponente(dto);
      }
      router.push(`/admin/componentes?categoria=${categoriaId}`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar componente');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-[560px] space-y-4">
      <div className="space-y-1.5">
        <Label>Categoria</Label>
        {emEdicao ? (
          <p className="text-[14px] text-[#6E6E73]">
            {categorias.find((c) => c.id === categoriaId)?.nome ?? '...'}{' '}
            <span className="text-[12px]">(não pode ser alterada após a criação)</span>
          </p>
        ) : (
          <Select value={categoriaId} onValueChange={handleCategoriaChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!emEdicao && avisoTrocaCategoria && (
          <p className="text-[12px] text-[#6E6E73]">
            Os valores preenchidos foram descartados ao trocar de categoria.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Marca</Label>
        <Select value={marcaId} onValueChange={setMarcaId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione a marca" />
          </SelectTrigger>
          <SelectContent>
            {marcas.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>

      {caracteristicasDaCategoria.length > 0 && (
        <div className="space-y-3 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] p-4">
          <p className="text-[13px] font-semibold text-[#1D1D1F]">
            Características de {categorias.find((c) => c.id === categoriaId)?.nome ?? 'categoria'}
          </p>
          {caracteristicasDaCategoria.map((c) => (
            <div key={c.id} className="space-y-1.5">
              <Label htmlFor={`valor-${c.id}`}>{c.nome}</Label>
              <Input
                id={`valor-${c.id}`}
                type={c.tipo === 'INTEIRO' ? 'number' : 'text'}
                value={valores[c.id] ?? ''}
                onChange={(e) => handleValorChange(c.id, e.target.value)}
                className="bg-white"
                required
              />
            </div>
          ))}
        </div>
      )}

      <ErrorBanner mensagem={erro} />

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={salvando || !nome.trim() || !marcaId || !categoriaId || !valoresCompletos}
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/componentes?categoria=${categoriaId}`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
