import { PrismaClient } from '@prisma/client';

// Guarda de segurança — roda no escopo do módulo, ANTES de qualquer PrismaClient
// ser instanciado. Se DATABASE_URL estiver ausente ou não apontar claramente para
// um banco de teste, este módulo lança e nunca chega a exportar um client
// utilizável: nenhum teste consegue tocar um banco (nem via limparBanco(), nem
// via um create/delete direto) sem que esta checagem já tenha passado.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL não definida. Copie apps/api/.env.test.example para ' +
      'apps/api/.env.test e configure um banco de teste dedicado antes de rodar ' +
      'os testes de integração (veja a seção "Testes de integração" do README).',
  );
}

if (!/test/i.test(databaseUrl)) {
  throw new Error(
    'DATABASE_URL não parece apontar para um banco de teste (esperado algo como ' +
      '"hardware_csp_test" no nome do banco). Recusando continuar para não ' +
      'truncar um banco de desenvolvimento ou produção por engano. Verifique ' +
      'apps/api/.env.test.',
  );
}

export const prismaTest = new PrismaClient();

const TABELAS_EM_ORDEM_SEGURA_DE_FK = [
  'restricao',
  'componente_caracteristica',
  'componente',
  'caracteristica',
  'categoria',
  'marca',
] as const;

export async function limparBanco(): Promise<void> {
  const tabelas = TABELAS_EM_ORDEM_SEGURA_DE_FK.map((t) => `"${t}"`).join(', ');
  await prismaTest.$executeRawUnsafe(`TRUNCATE TABLE ${tabelas} CASCADE;`);
}

export async function fechar(): Promise<void> {
  await prismaTest.$disconnect();
}
