-- CreateEnum
CREATE TYPE "QueenStatus" AS ENUM ('WINNER', 'ACTIVE', 'ELIMINATED', 'RUNNER_UP', 'UNKNOWN_OR_ERROR', 'MS_CONGENIALITY');

-- AlterTable
ALTER TABLE "League" ADD COLUMN     "maxQueensPerTeam" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "Roster" ADD COLUMN     "pointUpdates" INTEGER[];

-- CreateTable
CREATE TABLE "Queen" (
    "queenId" SERIAL NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "QueenStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT NOT NULL,

    CONSTRAINT "Queen_pkey" PRIMARY KEY ("queenId")
);
