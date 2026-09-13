const path = require('path');

// Carrega apps/api/.env.test no process.env antes do Jest rodar. Só é confiável
// porque "test:integration" roda com --runInBand (sem processos-worker
// separados) — todo o processo compartilha este process.env mutado aqui.
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

/** @type {import('jest').Config} */
module.exports = {
  // 'ts' antes de 'js': evita que um .js compilado (stray build output,
  // ignorado pelo git) tenha precedência sobre o .ts fonte na resolução de
  // módulos ao importar prisma/seed.ts.
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.integration-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: 'tsconfig.integration.json' }],
  },
  testEnvironment: 'node',
};
