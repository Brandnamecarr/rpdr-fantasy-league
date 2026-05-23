/*
  Warnings:

  - You are about to drop the `FanSurveyResponse` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "FanSurveyResponse";

-- CreateTable
CREATE TABLE "FanSurvey" (
    "id" SERIAL NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FanSurvey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FanSurveyData" (
    "id" SERIAL NOT NULL,
    "surveyId" INTEGER NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "episode" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queenOfTheWeek" TEXT NOT NULL,
    "bottomOfTheWeek" TEXT NOT NULL,
    "lipSyncWinner" TEXT NOT NULL,
    "bestDressed" TEXT NOT NULL,
    "worstDressed" TEXT NOT NULL,

    CONSTRAINT "FanSurveyData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FanSurvey_franchise_season_episode_key" ON "FanSurvey"("franchise", "season", "episode");

-- CreateIndex
CREATE UNIQUE INDEX "FanSurveyData_surveyId_submittedBy_key" ON "FanSurveyData"("surveyId", "submittedBy");

-- AddForeignKey
ALTER TABLE "FanSurveyData" ADD CONSTRAINT "FanSurveyData_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "FanSurvey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
