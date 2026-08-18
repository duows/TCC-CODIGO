import { RestricaoForm } from '@/components/admin/restricao-form';

export default function NovaRestricaoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Nova restrição</h1>
      <RestricaoForm />
    </div>
  );
}
