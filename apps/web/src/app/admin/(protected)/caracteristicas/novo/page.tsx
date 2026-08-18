import { CaracteristicaForm } from '@/components/admin/caracteristica-form';

export default function NovaCaracteristicaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Nova característica</h1>
      <CaracteristicaForm />
    </div>
  );
}
