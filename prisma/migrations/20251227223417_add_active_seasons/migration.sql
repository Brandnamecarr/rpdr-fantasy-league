-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "ActiveSeasons" (
    "seasonId" SERIAL NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "activityStatus" "ActivityStatus" NOT NULL DEFAULT 'INACTIVE',

    CONSTRAINT "ActiveSeasons_pkey" PRIMARY KEY ("seasonId")
);
