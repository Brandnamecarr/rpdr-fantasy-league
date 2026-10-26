-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERIC', 'JOIN_REQUEST_RECEIVED', 'JOIN_REQUEST_APPROVED', 'JOIN_REQUEST_DENIED');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "NotificationType" NOT NULL DEFAULT 'GENERIC',
ADD COLUMN     "joinRequestId" INTEGER;

-- CreateTable
CREATE TABLE "LeagueJoinRequest" (
    "id" SERIAL NOT NULL,
    "leagueName" TEXT NOT NULL,
    "franchise" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "requester" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "queens" TEXT[],
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeagueJoinRequest_leagueName_franchise_season_idx" ON "LeagueJoinRequest"("leagueName", "franchise", "season");

-- CreateIndex
CREATE INDEX "LeagueJoinRequest_requester_idx" ON "LeagueJoinRequest"("requester");
