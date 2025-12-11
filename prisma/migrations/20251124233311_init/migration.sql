-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" SERIAL NOT NULL,
    "leagueName" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "users" TEXT[],
    "maxPlayers" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Roster" (
    "recordId" SERIAL NOT NULL,
    "leagueName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "queens" TEXT[],
    "currentPoints" INTEGER NOT NULL,

    CONSTRAINT "Roster_pkey" PRIMARY KEY ("recordId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "League_leagueName_key" ON "League"("leagueName");
