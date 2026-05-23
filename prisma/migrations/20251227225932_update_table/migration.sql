/*
  Warnings:

  - A unique constraint covering the columns `[franchise,season]` on the table `ActiveSeasons` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ActiveSeasons_franchise_season_key" ON "ActiveSeasons"("franchise", "season");
