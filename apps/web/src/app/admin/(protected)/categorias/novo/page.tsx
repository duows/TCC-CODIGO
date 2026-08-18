import { CategoriaForm } from '@/components/admin/categoria-form';

export default function NovaCategoriaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[22px] font-bold text-[#1D1D1F]">Nova categoria</h1>
      <CategoriaForm />
    </div>
  );
}
