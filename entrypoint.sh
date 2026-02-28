#!/bin/sh
# Container entrypoint for rpdr-fantasy-league on AWS Fargate.
# Runs pending Prisma migrations before starting the Node server.
# ECS will surface any non-zero exit here as a task failure.

set -e

echo "[entrypoint] Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] Starting server..."
exec node dist/server.js
