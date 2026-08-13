/**
 * Database Seeding — RF-18 do TCC.
 *
 * Popula a base de conhecimento com o modelo genérico EAV <X, D, C>:
 *   - Marcas, Categorias e Características (metadados)
 *   - Componentes com seus valores de características (domínios D)
 *   - Restrições binárias do CSP (conjunto C)
 *
 * Para executar:
 *   pnpm db:seed
 */

import { PrismaClient, TipoCaracteristica, OperadorRestricao } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed da base de conhecimento...');

  // ---------------------------------------------------------------------------
  // Limpeza — ordem inversa das dependências FK
  // ---------------------------------------------------------------------------
  await prisma.restricao.deleteMany();
  await prisma.componenteCaracteristica.deleteMany();
  await prisma.componente.deleteMany();
  await prisma.caracteristica.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.marca.deleteMany();

  // ---------------------------------------------------------------------------
  // 1) MARCAS
  // ---------------------------------------------------------------------------

  const [amd, asus, msi, corsair, kingston, gskill, fsp] = await Promise.all([
    prisma.marca.create({ data: { nome: 'AMD' } }),
    prisma.marca.create({ data: { nome: 'ASUS' } }),
    prisma.marca.create({ data: { nome: 'MSI' } }),
    prisma.marca.create({ data: { nome: 'Corsair' } }),
    prisma.marca.create({ data: { nome: 'Kingston' } }),
    prisma.marca.create({ data: { nome: 'G.Skill' } }),
    prisma.marca.create({ data: { nome: 'FSP' } }),
  ]);

  console.log('  Marcas cadastradas: 7');

  // ---------------------------------------------------------------------------
  // 2) CATEGORIAS (variáveis X do CSP) — ordem define sequência do wizard
  // ---------------------------------------------------------------------------

  const [catCpu, catPlaca, catRam, catGpu, catFonte] = await Promise.all([
    prisma.categoria.create({ data: { nome: 'CPU', ordem: 1 } }),
    prisma.categoria.create({ data: { nome: 'Placa-Mãe', ordem: 2 } }),
    prisma.categoria.create({ data: { nome: 'RAM', ordem: 3 } }),
    prisma.categoria.create({ data: { nome: 'GPU', ordem: 4 } }),
    prisma.categoria.create({ data: { nome: 'Fonte', ordem: 5 } }),
  ]);

  console.log('  Categorias cadastradas: 5');

  // ---------------------------------------------------------------------------
  // 3) CARACTERÍSTICAS — atributos técnicos por categoria
  // ---------------------------------------------------------------------------

  // CPU
  const [carCpuSocket, carCpuTdp, carCpuGeracao, carCpuNucleos, carCpuThreads, carCpuFreq] =
    await Promise.all([
      prisma.caracteristica.create({ data: { categoriaId: catCpu.id, nome: 'socket', tipo: TipoCaracteristica.TEXTO } }),
      prisma.caracteristica.create({ data: { categoriaId: catCpu.id, nome: 'tdp', tipo: TipoCaracteristica.INTEIRO } }),
      prisma.caracteristica.create({ data: { categoriaId: catCpu.id, nome: 'geracao', tipo: TipoCaracteristica.TEXTO } }),
      prisma.caracteristica.create({ data: { categoriaId: catCpu.id, nome: 'nucleos', tipo: TipoCaracteristica.INTEIRO } }),
      prisma.caracteristica.create({ data: { categoriaId: catCpu.id, nome: 'threads', tipo: TipoCaracteristica.INTEIRO } }),
      prisma.caracteristica.create({ data: { categoriaId: catCpu.id, nome: 'frequencia', tipo: TipoCaracteristica.INTEIRO } }),
    ]);

  // Placa-Mãe
  const [carPlacaSocket, carPlacaMemoria, carPlacaChipset, carPlacaSlots] = await Promise.all([
    prisma.caracteristica.create({ data: { categoriaId: catPlaca.id, nome: 'socketSuportado', tipo: TipoCaracteristica.TEXTO } }),
    prisma.caracteristica.create({ data: { categoriaId: catPlaca.id, nome: 'padraoMemoria', tipo: TipoCaracteristica.TEXTO } }),
    prisma.caracteristica.create({ data: { categoriaId: catPlaca.id, nome: 'chipset', tipo: TipoCaracteristica.TEXTO } }),
    prisma.caracteristica.create({ data: { categoriaId: catPlaca.id, nome: 'slotsRam', tipo: TipoCaracteristica.INTEIRO } }),
  ]);

  // RAM
  const [carRamPadrao, carRamCapacidade, carRamFreq] = await Promise.all([
    prisma.caracteristica.create({ data: { categoriaId: catRam.id, nome: 'padrao', tipo: TipoCaracteristica.TEXTO } }),
    prisma.caracteristica.create({ data: { categoriaId: catRam.id, nome: 'capacidade', tipo: TipoCaracteristica.INTEIRO } }),
    prisma.caracteristica.create({ data: { categoriaId: catRam.id, nome: 'frequencia', tipo: TipoCaracteristica.INTEIRO } }),
  ]);

  // GPU
  const [carGpuTdp, carGpuVram, carGpuFreq, carGpuInterface] = await Promise.all([
    prisma.caracteristica.create({ data: { categoriaId: catGpu.id, nome: 'tdp', tipo: TipoCaracteristica.INTEIRO } }),
    prisma.caracteristica.create({ data: { categoriaId: catGpu.id, nome: 'vram', tipo: TipoCaracteristica.INTEIRO } }),
    prisma.caracteristica.create({ data: { categoriaId: catGpu.id, nome: 'frequencia', tipo: TipoCaracteristica.INTEIRO } }),
    prisma.caracteristica.create({ data: { categoriaId: catGpu.id, nome: 'interface', tipo: TipoCaracteristica.TEXTO } }),
  ]);

  // Fonte
  const [carFontePotencia, carFonteCert] = await Promise.all([
    prisma.caracteristica.create({ data: { categoriaId: catFonte.id, nome: 'potencia', tipo: TipoCaracteristica.INTEIRO } }),
    prisma.caracteristica.create({ data: { categoriaId: catFonte.id, nome: 'certificacao', tipo: TipoCaracteristica.TEXTO } }),
  ]);

  console.log('  Características cadastradas: 19');

  // ---------------------------------------------------------------------------
  // 4) COMPONENTES + VALORES (domínio D de cada variável)
  //
  // Modelos comercialmente disponíveis; especificações conforme documentação
  // oficial dos fabricantes (RNF-09). Plataformas AM4 e AM5.
  // ---------------------------------------------------------------------------

  // Helper para criar componente + seus valores EAV de uma vez
  async function criarComponente(
    nome: string,
    marcaId: string,
    categoriaId: string,
    valores: Array<{ caracteristicaId: string; valor: string }>,
  ) {
    const comp = await prisma.componente.create({ data: { nome, marcaId, categoriaId } });
    await prisma.componenteCaracteristica.createMany({
      data: valores.map((v) => ({ componenteId: comp.id, ...v })),
    });
    return comp;
  }

  // CPUs
  await criarComponente('Ryzen 5 5600', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM4' },
    { caracteristicaId: carCpuTdp.id, valor: '65' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 3' },
    { caracteristicaId: carCpuNucleos.id, valor: '6' },
    { caracteristicaId: carCpuThreads.id, valor: '12' },
    { caracteristicaId: carCpuFreq.id, valor: '3500' },
  ]);

  await criarComponente('Ryzen 5 7600', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM5' },
    { caracteristicaId: carCpuTdp.id, valor: '65' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 4' },
    { caracteristicaId: carCpuNucleos.id, valor: '6' },
    { caracteristicaId: carCpuThreads.id, valor: '12' },
    { caracteristicaId: carCpuFreq.id, valor: '3800' },
  ]);

  await criarComponente('Ryzen 5 5600X', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM4' },
    { caracteristicaId: carCpuTdp.id, valor: '65' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 3' },
    { caracteristicaId: carCpuNucleos.id, valor: '6' },
    { caracteristicaId: carCpuThreads.id, valor: '12' },
    { caracteristicaId: carCpuFreq.id, valor: '3700' },
  ]);

  await criarComponente('Ryzen 7 5800X', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM4' },
    { caracteristicaId: carCpuTdp.id, valor: '105' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 3' },
    { caracteristicaId: carCpuNucleos.id, valor: '8' },
    { caracteristicaId: carCpuThreads.id, valor: '16' },
    { caracteristicaId: carCpuFreq.id, valor: '3800' },
  ]);

  await criarComponente('Ryzen 9 5950X', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM4' },
    { caracteristicaId: carCpuTdp.id, valor: '105' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 3' },
    { caracteristicaId: carCpuNucleos.id, valor: '16' },
    { caracteristicaId: carCpuThreads.id, valor: '32' },
    { caracteristicaId: carCpuFreq.id, valor: '3400' },
  ]);

  await criarComponente('Ryzen 7 7700X', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM5' },
    { caracteristicaId: carCpuTdp.id, valor: '105' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 4' },
    { caracteristicaId: carCpuNucleos.id, valor: '8' },
    { caracteristicaId: carCpuThreads.id, valor: '16' },
    { caracteristicaId: carCpuFreq.id, valor: '4500' },
  ]);

  await criarComponente('Ryzen 9 7900X', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM5' },
    { caracteristicaId: carCpuTdp.id, valor: '170' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 4' },
    { caracteristicaId: carCpuNucleos.id, valor: '12' },
    { caracteristicaId: carCpuThreads.id, valor: '24' },
    { caracteristicaId: carCpuFreq.id, valor: '4700' },
  ]);

  await criarComponente('Ryzen 9 7950X', amd.id, catCpu.id, [
    { caracteristicaId: carCpuSocket.id, valor: 'AM5' },
    { caracteristicaId: carCpuTdp.id, valor: '170' },
    { caracteristicaId: carCpuGeracao.id, valor: 'Zen 4' },
    { caracteristicaId: carCpuNucleos.id, valor: '16' },
    { caracteristicaId: carCpuThreads.id, valor: '32' },
    { caracteristicaId: carCpuFreq.id, valor: '4500' },
  ]);

  // Placas-mãe
  await criarComponente('PRIME B550M-A', asus.id, catPlaca.id, [
    { caracteristicaId: carPlacaSocket.id, valor: 'AM4' },
    { caracteristicaId: carPlacaMemoria.id, valor: 'DDR4' },
    { caracteristicaId: carPlacaChipset.id, valor: 'B550' },
    { caracteristicaId: carPlacaSlots.id, valor: '4' },
  ]);

  await criarComponente('PRO B650-P WIFI', msi.id, catPlaca.id, [
    { caracteristicaId: carPlacaSocket.id, valor: 'AM5' },
    { caracteristicaId: carPlacaMemoria.id, valor: 'DDR5' },
    { caracteristicaId: carPlacaChipset.id, valor: 'B650' },
    { caracteristicaId: carPlacaSlots.id, valor: '4' },
  ]);

  await criarComponente('TUF GAMING X570-PLUS', asus.id, catPlaca.id, [
    { caracteristicaId: carPlacaSocket.id, valor: 'AM4' },
    { caracteristicaId: carPlacaMemoria.id, valor: 'DDR4' },
    { caracteristicaId: carPlacaChipset.id, valor: 'X570' },
    { caracteristicaId: carPlacaSlots.id, valor: '4' },
  ]);

  await criarComponente('MAG B550 TOMAHAWK', msi.id, catPlaca.id, [
    { caracteristicaId: carPlacaSocket.id, valor: 'AM4' },
    { caracteristicaId: carPlacaMemoria.id, valor: 'DDR4' },
    { caracteristicaId: carPlacaChipset.id, valor: 'B550' },
    { caracteristicaId: carPlacaSlots.id, valor: '4' },
  ]);

  await criarComponente('ROG STRIX B650E-F', asus.id, catPlaca.id, [
    { caracteristicaId: carPlacaSocket.id, valor: 'AM5' },
    { caracteristicaId: carPlacaMemoria.id, valor: 'DDR5' },
    { caracteristicaId: carPlacaChipset.id, valor: 'B650E' },
    { caracteristicaId: carPlacaSlots.id, valor: '4' },
  ]);

  await criarComponente('MAG X670E TOMAHAWK', msi.id, catPlaca.id, [
    { caracteristicaId: carPlacaSocket.id, valor: 'AM5' },
    { caracteristicaId: carPlacaMemoria.id, valor: 'DDR5' },
    { caracteristicaId: carPlacaChipset.id, valor: 'X670E' },
    { caracteristicaId: carPlacaSlots.id, valor: '4' },
  ]);

  // Memórias RAM
  await criarComponente('Vengeance LPX 16GB', corsair.id, catRam.id, [
    { caracteristicaId: carRamPadrao.id, valor: 'DDR4' },
    { caracteristicaId: carRamCapacidade.id, valor: '16' },
    { caracteristicaId: carRamFreq.id, valor: '3200' },
  ]);

  await criarComponente('Fury Beast 16GB DDR5', kingston.id, catRam.id, [
    { caracteristicaId: carRamPadrao.id, valor: 'DDR5' },
    { caracteristicaId: carRamCapacidade.id, valor: '16' },
    { caracteristicaId: carRamFreq.id, valor: '5600' },
  ]);

  await criarComponente('Vengeance LPX 32GB', corsair.id, catRam.id, [
    { caracteristicaId: carRamPadrao.id, valor: 'DDR4' },
    { caracteristicaId: carRamCapacidade.id, valor: '32' },
    { caracteristicaId: carRamFreq.id, valor: '3600' },
  ]);

  await criarComponente('Fury Beast 16GB DDR4', kingston.id, catRam.id, [
    { caracteristicaId: carRamPadrao.id, valor: 'DDR4' },
    { caracteristicaId: carRamCapacidade.id, valor: '16' },
    { caracteristicaId: carRamFreq.id, valor: '3200' },
  ]);

  await criarComponente('Vengeance 32GB DDR5', corsair.id, catRam.id, [
    { caracteristicaId: carRamPadrao.id, valor: 'DDR5' },
    { caracteristicaId: carRamCapacidade.id, valor: '32' },
    { caracteristicaId: carRamFreq.id, valor: '6000' },
  ]);

  await criarComponente('Trident Z5 32GB', gskill.id, catRam.id, [
    { caracteristicaId: carRamPadrao.id, valor: 'DDR5' },
    { caracteristicaId: carRamCapacidade.id, valor: '32' },
    { caracteristicaId: carRamFreq.id, valor: '6000' },
  ]);

  // GPUs
  await criarComponente('Radeon RX 6600', amd.id, catGpu.id, [
    { caracteristicaId: carGpuTdp.id, valor: '132' },
    { caracteristicaId: carGpuVram.id, valor: '8' },
    { caracteristicaId: carGpuFreq.id, valor: '1626' },
    { caracteristicaId: carGpuInterface.id, valor: 'PCIe 4.0 x8' },
  ]);

  await criarComponente('Radeon RX 7900 XT', amd.id, catGpu.id, [
    { caracteristicaId: carGpuTdp.id, valor: '315' },
    { caracteristicaId: carGpuVram.id, valor: '20' },
    { caracteristicaId: carGpuFreq.id, valor: '2000' },
    { caracteristicaId: carGpuInterface.id, valor: 'PCIe 4.0 x16' },
  ]);

  await criarComponente('Radeon RX 6700 XT', amd.id, catGpu.id, [
    { caracteristicaId: carGpuTdp.id, valor: '230' },
    { caracteristicaId: carGpuVram.id, valor: '12' },
    { caracteristicaId: carGpuFreq.id, valor: '2424' },
    { caracteristicaId: carGpuInterface.id, valor: 'PCIe 4.0 x16' },
  ]);

  await criarComponente('Radeon RX 6800 XT', amd.id, catGpu.id, [
    { caracteristicaId: carGpuTdp.id, valor: '300' },
    { caracteristicaId: carGpuVram.id, valor: '16' },
    { caracteristicaId: carGpuFreq.id, valor: '2015' },
    { caracteristicaId: carGpuInterface.id, valor: 'PCIe 4.0 x16' },
  ]);

  await criarComponente('Radeon RX 7600', amd.id, catGpu.id, [
    { caracteristicaId: carGpuTdp.id, valor: '165' },
    { caracteristicaId: carGpuVram.id, valor: '8' },
    { caracteristicaId: carGpuFreq.id, valor: '2250' },
    { caracteristicaId: carGpuInterface.id, valor: 'PCIe 4.0 x8' },
  ]);

  await criarComponente('Radeon RX 7800 XT', amd.id, catGpu.id, [
    { caracteristicaId: carGpuTdp.id, valor: '263' },
    { caracteristicaId: carGpuVram.id, valor: '16' },
    { caracteristicaId: carGpuFreq.id, valor: '2124' },
    { caracteristicaId: carGpuInterface.id, valor: 'PCIe 4.0 x16' },
  ]);

  // Fontes
  // Nota: "CV250" (250W, 80 PLUS White) do catálogo original não corresponde a
  // nenhum produto Corsair real (sem registro em corsair.com, na linha CV
  // histórica — que só desce a CV450 — nem nos bancos 80 PLUS/Cybenetics).
  // Substituída pela FSP250-60EGA (FSP Group), unidade real de 250W com
  // certificação 80 PLUS Gold confirmada na página oficial do fabricante,
  // preservando a potência de 250W da qual os exemplos de bloqueio dependem.
  await criarComponente('FSP250-60EGA', fsp.id, catFonte.id, [
    { caracteristicaId: carFontePotencia.id, valor: '250' },
    { caracteristicaId: carFonteCert.id, valor: '80 PLUS Gold' },
  ]);

  await criarComponente('CV550', corsair.id, catFonte.id, [
    { caracteristicaId: carFontePotencia.id, valor: '550' },
    { caracteristicaId: carFonteCert.id, valor: '80 PLUS Bronze' },
  ]);

  await criarComponente('RM850', corsair.id, catFonte.id, [
    { caracteristicaId: carFontePotencia.id, valor: '850' },
    { caracteristicaId: carFonteCert.id, valor: '80 PLUS Gold' },
  ]);

  await criarComponente('CV450', corsair.id, catFonte.id, [
    { caracteristicaId: carFontePotencia.id, valor: '450' },
    { caracteristicaId: carFonteCert.id, valor: '80 PLUS Bronze' },
  ]);

  await criarComponente('RM750', corsair.id, catFonte.id, [
    { caracteristicaId: carFontePotencia.id, valor: '750' },
    { caracteristicaId: carFonteCert.id, valor: '80 PLUS Gold' },
  ]);

  await criarComponente('HX1000', corsair.id, catFonte.id, [
    { caracteristicaId: carFontePotencia.id, valor: '1000' },
    { caracteristicaId: carFonteCert.id, valor: '80 PLUS Platinum' },
  ]);

  console.log('  Componentes cadastrados: 32 (8 CPUs, 6 Placas, 6 RAMs, 6 GPUs, 6 Fontes)');

  // ---------------------------------------------------------------------------
  // 5) RESTRIÇÕES DO CSP (conjunto C) — Figura 1 do TCC
  //
  // Convenção para MAIOR_OU_IGUAL:
  //   car1 = lado da DEMANDA/CONSUMO (tdp)
  //   car2 = lado da CAPACIDADE/OFERTA (potencia)
  //   fórmula: Number(val2) >= Number(val1) * Number(parametro)
  //
  // Placeholders do templateJustificativa:
  //   {comp1.nome}      = nome do componente no lado car1
  //   {val1}            = valor de car1 no componente 1
  //   {comp2.nome}      = nome do componente no lado car2
  //   {val2}            = valor de car2 no componente 2
  //   {val1_com_margem} = Math.round(Number(val1) * Number(parametro))
  // ---------------------------------------------------------------------------

  await prisma.restricao.create({
    data: {
      caracteristica1Id: carCpuSocket.id,
      caracteristica2Id: carPlacaSocket.id,
      operador: OperadorRestricao.IGUAL,
      templateJustificativa:
        '{comp2.nome} utiliza soquete {val2}, incompatível com {comp1.nome}, que exige soquete {val1}. O soquete é a interface física entre processador e placa-mãe, e cada padrão possui número e disposição de contatos próprios, de modo que um processador não encaixa mecanicamente em um soquete de padrão diferente.',
    },
  });

  await prisma.restricao.create({
    data: {
      // Operador IGUAL: a designação variavelDemanda/variavelCapacidade é indiferente
      // para IGUAL — o AC-3 enfileira os dois arcos e detecta a incompatibilidade em
      // qualquer sentido. RAM como variavelDemanda (car1) é mantida por consistência
      // com o templateJustificativa ("{comp1.nome} utiliza padrão de memória {val1}…").
      caracteristica1Id: carRamPadrao.id,
      caracteristica2Id: carPlacaMemoria.id,
      operador: OperadorRestricao.IGUAL,
      templateJustificativa:
        '{comp1.nome} utiliza padrão de memória {val1}, incompatível com {comp2.nome}, que suporta apenas {val2}. Cada padrão de memória possui posição de chanfro e tensão de operação próprias, de modo que um módulo não se encaixa no slot de outro padrão nem opera eletricamente nele.',
    },
  });

  // TDP CPU ↔ Potência da Fonte
  await prisma.restricao.create({
    data: {
      caracteristica1Id: carCpuTdp.id,
      caracteristica2Id: carFontePotencia.id,
      operador: OperadorRestricao.MAIOR_OU_IGUAL,
      parametro: '1.25',
      templateJustificativa:
        '{comp2.nome} fornece {val2}W, insuficiente para {comp1.nome}, que exige no mínimo {val1_com_margem}W. O consumo nominal do componente é de {val1}W, ao qual se acrescenta uma margem de segurança que cobre picos transitórios de consumo e a perda de eficiência da fonte ao longo de sua vida útil.',
    },
  });

  // TDP GPU ↔ Potência da Fonte
  await prisma.restricao.create({
    data: {
      caracteristica1Id: carGpuTdp.id,
      caracteristica2Id: carFontePotencia.id,
      operador: OperadorRestricao.MAIOR_OU_IGUAL,
      parametro: '1.25',
      templateJustificativa:
        '{comp2.nome} fornece {val2}W, insuficiente para {comp1.nome}, que exige no mínimo {val1_com_margem}W. O consumo nominal do componente é de {val1}W, ao qual se acrescenta uma margem de segurança que cobre picos transitórios de consumo e a perda de eficiência da fonte ao longo de sua vida útil.',
    },
  });

  console.log('  Restrições cadastradas: 4 arestas (socket, memória, TDP×CPU, TDP×GPU)');
  console.log('Seed concluído.');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
