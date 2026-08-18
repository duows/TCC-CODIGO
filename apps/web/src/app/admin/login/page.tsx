'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorBanner } from '@/components/admin/error-banner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const { accessToken } = await api.login(senha);
      setToken(accessToken);
      router.replace('/admin');
    } catch (e) {
      setErro(e instanceof ApiError && e.status === 401 ? 'Senha incorreta' : 'Falha ao entrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-[#E5E5EA] bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-[22px] font-bold text-[#1D1D1F]" style={{ letterSpacing: '-0.02em' }}>
          Área administrativa
        </h1>
        <p className="mb-6 text-[14px] text-[#6E6E73]">
          Entre com a senha de administrador para gerenciar a base de conhecimento.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              required
            />
          </div>

          <ErrorBanner mensagem={erro} />

          <Button type="submit" disabled={carregando || !senha} className="w-full">
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </main>
  );
}
