REM run this if changes made to the models in prisma/schema.prisma

npx prisma migrate dev --name init

REM don't forget to run
REM npx prisma generate after this script finishes
