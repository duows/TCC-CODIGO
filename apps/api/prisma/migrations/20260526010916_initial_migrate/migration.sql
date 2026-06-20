-- CreateTable
CREATE TABLE "cpu" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "tdp" INTEGER NOT NULL,
    "socket" TEXT NOT NULL,
    "geracao" TEXT NOT NULL,
    "nucleos" INTEGER NOT NULL,
    "threads" INTEGER NOT NULL,
    "frequencia" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cpu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placa_mae" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "tdp" INTEGER NOT NULL DEFAULT 0,
    "socketSuportado" TEXT NOT NULL,
    "chipset" TEXT NOT NULL,
    "padraoMemoria" TEXT NOT NULL,
    "slotsRam" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placa_mae_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ram" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "tdp" INTEGER NOT NULL DEFAULT 0,
    "padraoMemoria" TEXT NOT NULL,
    "capacidade" INTEGER NOT NULL,
    "frequencia" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gpu" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "tdp" INTEGER NOT NULL,
    "vram" INTEGER NOT NULL,
    "frequencia" INTEGER NOT NULL,
    "interface" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gpu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fonte" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "tdp" INTEGER NOT NULL DEFAULT 0,
    "potencia" INTEGER NOT NULL,
    "certificacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fonte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restricao" (
    "id" TEXT NOT NULL,
    "variavel1" TEXT NOT NULL,
    "variavel2" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "atributoChave" TEXT NOT NULL,
    "margemSeguranca" INTEGER DEFAULT 25,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restricao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cpu_socket_idx" ON "cpu"("socket");

-- CreateIndex
CREATE INDEX "placa_mae_socketSuportado_idx" ON "placa_mae"("socketSuportado");

-- CreateIndex
CREATE INDEX "placa_mae_padraoMemoria_idx" ON "placa_mae"("padraoMemoria");

-- CreateIndex
CREATE INDEX "ram_padraoMemoria_idx" ON "ram"("padraoMemoria");

-- CreateIndex
CREATE INDEX "fonte_potencia_idx" ON "fonte"("potencia");

-- CreateIndex
CREATE UNIQUE INDEX "restricao_UK_01" ON "restricao"("variavel1", "variavel2", "tipo");
