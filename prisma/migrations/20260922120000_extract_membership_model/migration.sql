/*
  Warnings:

  - You are about to drop the column `hasActiveMembership` on the `User` table. All the data in the column is migrated to the new `Membership` table.
  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column is migrated to the new `Membership` table.
  - You are about to drop the column `stripeSubscriptionId` on the `User` table. All the data in the column is migrated to the new `Membership` table.
  - You are about to drop the column `membershipCancelAtPeriodEnd` on the `User` table. All the data in the column is migrated to the new `Membership` table.
  - You are about to drop the column `membershipRenewsAt` on the `User` table. All the data in the column is migrated to the new `Membership` table.
  - A unique constraint covering the columns `[userId]` on the table `Membership` will be added.

*/
-- CreateTable
CREATE TABLE "Membership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "hasActiveMembership" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "membershipCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "membershipRenewsAt" TIMESTAMP(3),

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- Backfill: carry over any existing non-default membership/Stripe data from User rows
INSERT INTO "Membership" ("userId", "hasActiveMembership", "stripeCustomerId", "stripeSubscriptionId", "membershipCancelAtPeriodEnd", "membershipRenewsAt")
SELECT "id", "hasActiveMembership", "stripeCustomerId", "stripeSubscriptionId", "membershipCancelAtPeriodEnd", "membershipRenewsAt"
FROM "User"
WHERE "hasActiveMembership" = true
   OR "stripeCustomerId" IS NOT NULL
   OR "stripeSubscriptionId" IS NOT NULL
   OR "membershipCancelAtPeriodEnd" = true
   OR "membershipRenewsAt" IS NOT NULL;

-- DropIndex (old unique indexes on User)
DROP INDEX "User_stripeCustomerId_key";

-- DropIndex
DROP INDEX "User_stripeSubscriptionId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "hasActiveMembership",
DROP COLUMN "stripeCustomerId",
DROP COLUMN "stripeSubscriptionId",
DROP COLUMN "membershipCancelAtPeriodEnd",
DROP COLUMN "membershipRenewsAt";

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_key" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_stripeCustomerId_key" ON "Membership"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_stripeSubscriptionId_key" ON "Membership"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
