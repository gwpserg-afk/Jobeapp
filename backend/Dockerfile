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

# Start via a resilient script: retries `db push` on transient DB blips so a
# momentary database hiccup during deploy can't fail the whole deploy.
RUN chmod +x start.sh
CMD ["sh", "start.sh"]
