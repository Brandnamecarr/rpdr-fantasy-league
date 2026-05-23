-- CreateTable
CREATE TABLE "EpisodeResult" (
    "id" SERIAL NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "maxiWinner" TEXT[],
    "topQueens" TEXT[],
    "eliminated" TEXT[],
    "lipSyncWinner" TEXT[],
    "isSnatchGame" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeResult_franchise_season_episode_key" ON "EpisodeResult"("franchise", "season", "episode");
