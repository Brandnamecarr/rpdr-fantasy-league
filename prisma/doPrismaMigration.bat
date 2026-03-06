@echo off
REM run this if changes made to the models in prisma/schema.prisma

set migrationName=%1

npx prisma migrate dev --name %migrationName%

REM don't forget to run
REM npx prisma generate after this script finishes
npx prisma generate

REM Done with prisma migration and generation
