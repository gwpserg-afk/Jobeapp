#!/bin/sh
# Production startup for Render.
# Retries `prisma db push` so a transient database blip during deploy (Render's
# free Postgres is occasionally briefly unreachable) doesn't kill the whole
# deploy. After a few attempts we start the server anyway: /health stays up and
# the app recovers on its own once the database is reachable again.

set -u
PRISMA="bun node_modules/prisma/build/index.js"

i=1
max=6
until $PRISMA db push --accept-data-loss; do
  if [ "$i" -ge "$max" ]; then
    echo "⚠️  db push failed after $max attempts — starting server anyway (will recover when DB is reachable)."
    break
  fi
  echo "db push attempt $i failed — retrying in 10s…"
  i=$((i + 1))
  sleep 10
done

# Seed/refresh demo content (idempotent, never fatal).
bun scripts/seed-social.ts || true

exec bun run src/index.ts
