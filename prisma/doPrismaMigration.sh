#!/bin/bash
set -e

NAME=$1

npx prisma migrate dev --name $NAME

npx prisma generate

echo "Done with Prisma Migration"