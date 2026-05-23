-- CreateEnum
CREATE TYPE "BracketName" AS ENUM ('A', 'B', 'C');

-- AlterTable
ALTER TABLE "ActiveSeasons" ADD COLUMN     "bracketCount" INTEGER,
ADD COLUMN     "isUsingBrackets" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Bracket" (
    "bracketId" SERIAL NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "bracketName" "BracketName" NOT NULL,
    "queens" TEXT[],

    CONSTRAINT "Bracket_pkey" PRIMARY KEY ("bracketId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bracket_franchise_season_bracketName_key" ON "Bracket"("franchise", "season", "bracketName");
