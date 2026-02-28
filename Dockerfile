# ─────────────────────────────────────────────
# Stage 1: Build
#   Installs all dependencies (including dev),
#   generates the Prisma client, and compiles TypeScript.
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first so Docker can cache the install layer
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (including devDependencies needed for tsc)
RUN npm ci

# Generate Prisma client for the build platform
RUN npx prisma generate

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript → dist/
RUN npx tsc

# ─────────────────────────────────────────────
# Stage 2: Production runner
#   Only production dependencies, no dev tooling.
#   Copies compiled output from the builder stage.
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install production deps only, then re-generate Prisma client
# for this platform/architecture
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled JavaScript from the builder stage
COPY --from=builder /app/dist ./dist/

# Copy the container entrypoint script
# sed strips Windows CRLF line endings so the script runs correctly on Alpine
COPY entrypoint.sh ./
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Expose the application port (must match PORT env var)
EXPOSE 3000

# Run migrations then start the server
ENTRYPOINT ["sh", "entrypoint.sh"]
