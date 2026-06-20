/*
  Warnings:

  - You are about to drop the column `atributoChave` on the `restricao` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `restricao` table. All the data in the column will be lost.
  - You are about to drop the column `margemSeguranca` on the `restricao` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `restricao` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `restricao` table. All the data in the column will be lost.
  - You are about to drop the column `variavel1` on the `restricao` table. All the data in the column will be lost.
  - You are about to drop the column `variavel2` on the `restricao` table. All the data in the column will be lost.
  - You are about to drop the `cpu` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `fonte` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `gpu` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `placa_mae` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ram` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `caracteristica1Id` to the `restricao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `caracteristica2Id` to the `restricao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operador` to the `restricao` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateJustificativa` to the `restricao` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoCaracteristica" AS ENUM ('TEXTO', 'INTEIRO');

-- CreateEnum
CREATE TYPE "OperadorRestricao" AS ENUM ('IGUAL', 'MAIOR_OU_IGUAL');

-- DropIndex
DROP INDEX "restricao_UK_01";

-- AlterTable
ALTER TABLE "restricao" DROP COLUMN "atributoChave",
DROP COLUMN "createdAt",
DROP COLUMN "margemSeguranca",
DROP COLUMN "tipo",
DROP COLUMN "updatedAt",
DROP COLUMN "variavel1",
DROP COLUMN "variavel2",
ADD COLUMN     "caracteristica1Id" TEXT NOT NULL,
ADD COLUMN     "caracteristica2Id" TEXT NOT NULL,
ADD COLUMN     "operador" "OperadorRestricao" NOT NULL,
ADD COLUMN     "parametro" TEXT,
ADD COLUMN     "templateJustificativa" TEXT NOT NULL;

-- DropTable
DROP TABLE "cpu";

-- DropTable
DROP TABLE "fonte";

-- DropTable
DROP TABLE "gpu";

-- DropTable
DROP TABLE "placa_mae";

-- DropTable
DROP TABLE "ram";

-- CreateTable
CREATE TABLE "marca" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caracteristica" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCaracteristica" NOT NULL,

    CONSTRAINT "caracteristica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "componente" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "marcaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "componente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "componente_caracteristica" (
    "id" TEXT NOT NULL,
    "componenteId" TEXT NOT NULL,
    "caracteristicaId" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "componente_caracteristica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marca_nome_key" ON "marca"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nome_key" ON "categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "caracteristica_UK_01" ON "caracteristica"("categoriaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "comp_car_UK_01" ON "componente_caracteristica"("componenteId", "caracteristicaId");

-- AddForeignKey
ALTER TABLE "caracteristica" ADD CONSTRAINT "caracteristica_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componente" ADD CONSTRAINT "componente_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componente" ADD CONSTRAINT "componente_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componente_caracteristica" ADD CONSTRAINT "componente_caracteristica_componenteId_fkey" FOREIGN KEY ("componenteId") REFERENCES "componente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "componente_caracteristica" ADD CONSTRAINT "componente_caracteristica_caracteristicaId_fkey" FOREIGN KEY ("caracteristicaId") REFERENCES "caracteristica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricao" ADD CONSTRAINT "restricao_caracteristica1Id_fkey" FOREIGN KEY ("caracteristica1Id") REFERENCES "caracteristica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restricao" ADD CONSTRAINT "restricao_caracteristica2Id_fkey" FOREIGN KEY ("caracteristica2Id") REFERENCES "caracteristica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
