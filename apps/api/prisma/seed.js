"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Iniciando seed da base de conhecimento...');
    await prisma.restricao.deleteMany();
    await prisma.restricao.createMany({
        data: [
            {
                variavel1: 'CPU',
                variavel2: 'PLACA_MAE',
                tipo: 'SOCKET',
                atributoChave: 'socket=socketSuportado',
            },
            {
                variavel1: 'PLACA_MAE',
                variavel2: 'RAM',
                tipo: 'PADRAO_MEMORIA',
                atributoChave: 'padraoMemoria=padraoMemoria',
            },
            {
                variavel1: 'CPU',
                variavel2: 'FONTE',
                tipo: 'TDP',
                atributoChave: 'tdp<=potencia',
                margemSeguranca: 25,
            },
            {
                variavel1: 'GPU',
                variavel2: 'FONTE',
                tipo: 'TDP',
                atributoChave: 'tdp<=potencia',
                margemSeguranca: 25,
            },
        ],
    });
    console.log('  ✓ Restrições do CSP cadastradas (4 arestas)');
    await prisma.cPU.deleteMany();
    await prisma.placaMae.deleteMany();
    await prisma.rAM.deleteMany();
    await prisma.gPU.deleteMany();
    await prisma.fonte.deleteMany();
    const cpus = await prisma.cPU.createMany({
        data: [
            {
                nome: 'Ryzen 5 5600',
                marca: 'AMD',
                tdp: 65,
                socket: 'AM4',
                geracao: 'Zen 3',
                nucleos: 6,
                threads: 12,
                frequencia: 3500,
            },
            {
                nome: 'Ryzen 5 7600',
                marca: 'AMD',
                tdp: 65,
                socket: 'AM5',
                geracao: 'Zen 4',
                nucleos: 6,
                threads: 12,
                frequencia: 3800,
            },
        ],
    });
    const placas = await prisma.placaMae.createMany({
        data: [
            {
                nome: 'PRIME B550M-A',
                marca: 'ASUS',
                socketSuportado: 'AM4',
                chipset: 'B550',
                padraoMemoria: 'DDR4',
                slotsRam: 4,
            },
            {
                nome: 'PRO B650-P WIFI',
                marca: 'MSI',
                socketSuportado: 'AM5',
                chipset: 'B650',
                padraoMemoria: 'DDR5',
                slotsRam: 4,
            },
        ],
    });
    const rams = await prisma.rAM.createMany({
        data: [
            {
                nome: 'Vengeance LPX 16GB',
                marca: 'Corsair',
                padraoMemoria: 'DDR4',
                capacidade: 16,
                frequencia: 3200,
            },
            {
                nome: 'Fury Beast 16GB',
                marca: 'Kingston',
                padraoMemoria: 'DDR5',
                capacidade: 16,
                frequencia: 5600,
            },
        ],
    });
    const gpus = await prisma.gPU.createMany({
        data: [
            {
                nome: 'Radeon RX 6600',
                marca: 'AMD',
                tdp: 130,
                vram: 8,
                frequencia: 1626,
                interface: 'PCIe 4.0 x8',
            },
            {
                nome: 'Radeon RX 7900 XT',
                marca: 'AMD',
                tdp: 315,
                vram: 20,
                frequencia: 2000,
                interface: 'PCIe 4.0 x16',
            },
        ],
    });
    const fontes = await prisma.fonte.createMany({
        data: [
            {
                nome: 'CV250',
                marca: 'Corsair',
                potencia: 250,
                certificacao: '80 PLUS White',
            },
            {
                nome: 'CV550',
                marca: 'Corsair',
                potencia: 550,
                certificacao: '80 PLUS Bronze',
            },
            {
                nome: 'RM850',
                marca: 'Corsair',
                potencia: 850,
                certificacao: '80 PLUS Gold',
            },
        ],
    });
    console.log(`  ✓ CPUs cadastradas: ${cpus.count}`);
    console.log(`  ✓ Placas-mãe cadastradas: ${placas.count}`);
    console.log(`  ✓ Módulos de RAM cadastrados: ${rams.count}`);
    console.log(`  ✓ GPUs cadastradas: ${gpus.count}`);
    console.log(`  ✓ Fontes cadastradas: ${fontes.count}`);
    console.log('✅ Seed concluído.');
}
main()
    .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map