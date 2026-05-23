-- CreateTable
CREATE TABLE "FanSurveyResponse" (
    "id" SERIAL NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "queenOfTheWeek" TEXT NOT NULL,
    "bottomOfTheWeek" TEXT NOT NULL,
    "lipSyncWinner" TEXT NOT NULL,
    "bestDressed" TEXT NOT NULL,
    "worstDressed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FanSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FanSurveyResponse_franchise_season_episode_submittedBy_key" ON "FanSurveyResponse"("franchise", "season", "episode", "submittedBy");
