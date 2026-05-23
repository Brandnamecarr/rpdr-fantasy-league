-- AlterTable
ALTER TABLE "ActiveSeasons" ADD COLUMN     "premiereDate" TEXT;

-- CreateTable
CREATE TABLE "SeasonFinaleResponse" (
    "id" SERIAL NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "winner" TEXT NOT NULL,
    "runnerUp" TEXT NOT NULL,
    "missCongeniality" TEXT NOT NULL,
    "bestDressed" TEXT NOT NULL,
    "fanFavorite" TEXT NOT NULL,
    "tradeOfTheSeason" TEXT NOT NULL,
    "mostImproved" TEXT NOT NULL,
    "snatcGameMvp" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonFinaleResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeasonFinaleResponse_franchise_season_submittedBy_key" ON "SeasonFinaleResponse"("franchise", "season", "submittedBy");
