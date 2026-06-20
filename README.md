# Sistema Especialista Educacional para Validação de Compatibilidade de Hardware

> TCC — Engenharia da Computação · IFSP Birigui · 2026
> Autor: Henrique José de Souza · Orientadora: Profa. Dra. Helen de Freitas Santos

Aplicação web full-stack que valida compatibilidade entre componentes de hardware
de desktop modelando o problema como **CSP (Problema de Satisfação de Restrições)**
e propagando restrições com o **algoritmo AC-3** (Mackworth, 1977). Para cada
incompatibilidade detectada, comunica ao usuário a regra física violada em
linguagem natural — implementando a *explanation facility* descrita por
Clancey (1983).

## Arquitetura

Três camadas (Seção 2.9.3 do TCC):

```
┌───────────────────┐    REST    ┌─────────────────────┐    SQL    ┌──────────────┐
│  Camada de        │  ────────► │  Camada de Lógica   │ ────────► │  Camada de   │
│  Apresentação     │            │  de Negócio         │           │  Dados       │
│  (Next.js wizard) │  ◄──────── │  (NestJS + AC-3)    │ ◄──────── │  (PostgreSQL)│
└───────────────────┘            └─────────────────────┘           └──────────────┘
```

## Estrutura do monorepo

```
hardware-csp/
├── apps/
│   ├── api/                    # Backend NestJS — motor de inferência
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Base de conhecimento (RF-17)
│   │   │   └── seed.ts         # Database Seeding (RF-18)
│   │   └── src/
│   │       ├── components/     # Catálogo (RF-01, RF-04)
│   │       ├── csp/            # Motor AC-3 (RF-05, RF-09)  ◄── coração
│   │       ├── explanations/   # Justificativas (RF-10–13)
│   │       ├── configurations/ # Endpoint POST /validate
│   │       └── prisma/         # PrismaService
│   └── web/                    # Frontend Next.js — interface wizard (RF-02)
│       └── src/
│           ├── app/            # App Router
│           ├── components/
│           └── lib/
├── packages/
│   ├── shared-types/           # Tipos TS compartilhados (Componente, Restricao...)
│   └── tsconfig/               # Tsconfigs compartilhados
├── docker-compose.yml          # PostgreSQL local (RNF-12)
├── turbo.json                  # Pipeline Turborepo
└── pnpm-workspace.yaml
```

## Pré-requisitos

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Docker** + Docker Compose (para o PostgreSQL)

## Setup

```bash
# 1) Instalar dependências (em todo o monorepo)
pnpm install

# 2) Variáveis de ambiente
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3) Subir o PostgreSQL via Docker
pnpm db:up

# 4) Gerar o cliente Prisma + criar tabelas
pnpm --filter @hardware-csp/api prisma:generate
pnpm db:migrate

# 5) Popular a base de conhecimento (edite prisma/seed.ts antes!)
pnpm db:seed
```

## Rodando em desenvolvimento

```bash
# Sobe API (3001) + Web (3000) em paralelo via Turborepo
pnpm dev
```

- API: <http://localhost:3001/api>
- Web: <http://localhost:3000>
- Prisma Studio (inspeção do banco): `pnpm db:studio`

## Endpoints da API

| Método | Rota                              | Requisito | Descrição                          |
|--------|-----------------------------------|-----------|------------------------------------|
| GET    | `/api/components/:categoria`      | RF-01     | Lista componentes de uma categoria |
| GET    | `/api/components/:categoria/:id`  | RF-04     | Especificações técnicas de um item |
| POST   | `/api/configurations/validate`    | RF-05, RF-09 | Roda AC-3 sobre o estado atual  |

Categorias válidas: `CPU`, `PLACA_MAE`, `RAM`, `GPU`, `FONTE`.

### Exemplo de validação

```bash
curl -X POST http://localhost:3001/api/configurations/validate \
  -H "Content-Type: application/json" \
  -d '{"estado": {"CPU": "uuid-de-uma-cpu-am5"}}'
```

Retorna `RespostaValidacao` com domínios podados e justificativas educativas.

## Onde está o quê (mapeando código ↔ TCC)

| Conceito do TCC                          | Arquivo                                          |
|------------------------------------------|--------------------------------------------------|
| Modelo de Domínio (Seção 5.5)            | `packages/shared-types/src/index.ts`             |
| Base de conhecimento (RF-17)             | `apps/api/prisma/schema.prisma`                  |
| Tripla CSP `<X, D, C>` (Seção 2.2)       | `apps/api/src/csp/types.ts` + `csp.service.ts`   |
| **Algoritmo AC-3 (Seção 2.6)**           | `apps/api/src/csp/ac3.ts` **← IMPLEMENTAR**      |
| Avaliação de restrições                  | `apps/api/src/csp/constraint-evaluator.ts` **← IMPLEMENTAR** |
| Explanation Facility (Seção 2.7.1)       | `apps/api/src/explanations/` **← IMPLEMENTAR**   |
| Interface wizard (RF-02)                 | `apps/web/src/app/wizard/page.tsx`               |
| Arquitetura em camadas (Seção 2.9.3)     | divisão `apps/web` ↔ `apps/api` ↔ Prisma         |

## Próximos passos

Veja os `TODO HENRIQUE` espalhados pelos arquivos abaixo, nesta ordem:

1. **`apps/api/prisma/seed.ts`** — popule com CPUs/placas/RAM AM4 e AM5, GPUs e fontes
2. **`apps/api/src/csp/constraint-evaluator.ts`** — implemente `avaliarRestricao()`
3. **`apps/api/src/csp/ac3.ts`** — implemente `ac3()`, `inicializarFila()`, `revisar()`
4. **`apps/api/src/explanations/explanations.service.ts`** — gere as justificativas
5. **`apps/web/src/app/wizard/page.tsx`** — expanda a UI conforme RF-03/14/15/16

## Convenções

- TypeScript estrito (`strict: true`, `noUncheckedIndexedAccess: true`)
- Prettier configurado na raiz
- Commits sugeridos: Conventional Commits (`feat:`, `fix:`, `chore:`...)

## Licença

Uso acadêmico — TCC.
