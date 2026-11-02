#!/bin/sh
set -e
export DATABASE_URL="${DATABASE_URL:-file:/data/prod.db}"

echo "Applying Prisma migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts || true
fi

# Free-tier SQLite can reset on restart — refill board when empty/thin or when forced.
JOB_COUNT="$(npx tsx scripts/count-active-jobs.ts 2>/dev/null || echo 0)"
echo "Active jobs in DB: ${JOB_COUNT}"
if [ "${RUN_IMPORT:-false}" = "true" ] || [ "${JOB_COUNT:-0}" -lt "${MIN_JOBS_BEFORE_IMPORT:-50}" ]; then
  echo "Importing Himalayas jobs (full board)..."
  npx tsx scripts/import-jobs.ts || true
else
  echo "Skipping import — board already has ${JOB_COUNT} jobs"
fi

echo "Starting RemoteJobsPK on :${PORT:-3000}"
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
