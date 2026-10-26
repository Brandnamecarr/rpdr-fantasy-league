-- CreateTable
CREATE TABLE "LeagueHistory" (
    "id" SERIAL NOT NULL,
    "originalLeagueId" INTEGER NOT NULL,
    "leagueName" TEXT NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "users" TEXT[],
    "maxPlayers" INTEGER NOT NULL,
    "maxQueensPerTeam" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterHistory" (
    "recordId" SERIAL NOT NULL,
    "originalRecordId" INTEGER NOT NULL,
    "leagueName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "queens" TEXT[],
    "currentPoints" INTEGER NOT NULL,
    "pointUpdates" INTEGER[],
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterHistory_pkey" PRIMARY KEY ("recordId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeagueHistory_originalLeagueId_key" ON "LeagueHistory"("originalLeagueId");

-- CreateIndex
CREATE INDEX "LeagueHistory_franchise_season_idx" ON "LeagueHistory"("franchise", "season");

-- CreateIndex
CREATE UNIQUE INDEX "RosterHistory_originalRecordId_key" ON "RosterHistory"("originalRecordId");

-- CreateIndex
CREATE INDEX "RosterHistory_franchise_season_idx" ON "RosterHistory"("franchise", "season");

-- CreateIndex
CREATE INDEX "RosterHistory_leagueName_idx" ON "RosterHistory"("leagueName");
