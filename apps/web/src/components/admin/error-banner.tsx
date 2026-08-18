import { AlertTriangle } from 'lucide-react';

export function ErrorBanner({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null;

  return (
    <div className="flex items-start gap-2 rounded-xl border border-[#FFCCC9] bg-red-50 px-4 py-3 text-[14px] font-medium text-[#FF3B30]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{mensagem}</span>
    </div>
  );
}
