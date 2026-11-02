#!/bin/sh
set -e
export DATABASE_URL="${DATABASE_URL:-file:/data/prod.db}"

echo "Applying Prisma migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts || true
fi

if [ "${RUN_IMPORT:-false}" = "true" ]; then
  echo "Importing Himalayas jobs..."
  npx tsx scripts/import-jobs.ts || true
fi

echo "Starting RemoteJobsPK on :${PORT:-3000}"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
