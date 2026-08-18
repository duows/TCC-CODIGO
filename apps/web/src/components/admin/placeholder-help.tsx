const PLACEHOLDERS_BASE = ['{comp1.nome}', '{val1}', '{comp2.nome}', '{val2}'] as const;
const PLACEHOLDER_MARGEM = '{val1_com_margem}';

const EXEMPLO = {
  '{comp1.nome}': 'Ryzen 5 7600',
  '{val1}': '65',
  '{comp2.nome}': 'CV250',
  '{val2}': '250',
};

function gerarPreview(template: string, parametro: string, mostrarMargem: boolean): string {
  let texto = template;
  for (const [placeholder, valor] of Object.entries(EXEMPLO)) {
    texto = texto.split(placeholder).join(valor);
  }
  if (mostrarMargem) {
    const margem = Math.round(Number(EXEMPLO['{val1}']) * (Number(parametro) || 1));
    texto = texto.split(PLACEHOLDER_MARGEM).join(String(margem));
  }
  return texto;
}

export function PlaceholderHelp({
  template,
  parametro,
  mostrarMargem,
}: {
  template: string;
  parametro: string;
  mostrarMargem: boolean;
}) {
  const placeholdersDisponiveis = mostrarMargem
    ? [...PLACEHOLDERS_BASE, PLACEHOLDER_MARGEM]
    : PLACEHOLDERS_BASE;

  const nenhumPlaceholderUsado = !placeholdersDisponiveis.some((p) => template.includes(p));
  const preview = template.trim() ? gerarPreview(template, parametro, mostrarMargem) : '';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {placeholdersDisponiveis.map((p) => (
          <code
            key={p}
            className="rounded-md bg-[#F5F5F7] px-1.5 py-0.5 text-[12px] text-[#1D1D1F]"
          >
            {p}
          </code>
        ))}
      </div>

      {template.trim() && (
        <div className="rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-3 py-2 text-[13px] text-[#6E6E73]">
          <span className="font-medium text-[#1D1D1F]">Prévia: </span>
          {preview}
        </div>
      )}

      {template.trim() && nenhumPlaceholderUsado && (
        <p className="text-[12px] text-[#B25000]">
          O texto não contém nenhum placeholder reconhecido — a justificativa exibida ao usuário
          final será sempre este texto literal, sem valores reais.
        </p>
      )}
    </div>
  );
}
