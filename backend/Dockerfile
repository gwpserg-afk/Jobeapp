FROM oven/bun:1-debian

WORKDIR /app

# Install deps (cached layer)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# App source
COPY . .

# Generate Prisma client for the Linux container
RUN bun node_modules/prisma/build/index.js generate

ENV NODE_ENV=production
EXPOSE 3000

# Sync schema, seed/refresh demo content (idempotent, non-fatal), then start.
CMD ["sh", "-c", "bun node_modules/prisma/build/index.js db push --accept-data-loss && (bun scripts/seed-social.ts || true) && bun run src/index.ts"]
