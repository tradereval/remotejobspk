#!/bin/sh
set -e
export DATABASE_URL="${DATABASE_URL:-file:/data/prod.db}"

echo "Applying Prisma migrations..."
npx prisma migrate deploy

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts || true
fi

# Never show placeholder apply links (example.com) on the public board
echo "Deactivating demo/example.com jobs..."
npx tsx scripts/deactivate-demo-jobs.ts || true

# Start the web server FIRST so free-tier cold starts don't hang on import.
echo "Starting RemoteJobsPK on :${PORT:-3000}"
npx next start -H 0.0.0.0 -p "${PORT:-3000}" &
APP_PID=$!

# Give Next a moment to bind the port before heavy import work.
sleep 3

JOB_COUNT="$(npx tsx scripts/count-active-jobs.ts 2>/dev/null || echo 0)"
MISSING_META="$(npx tsx scripts/count-missing-job-meta.ts 2>/dev/null || echo 9999)"
echo "Active jobs in DB: ${JOB_COUNT} (missing employmentType: ${MISSING_META})"

# Only import when board is thin or meta is missing — never block HTTP on boot.
# RUN_IMPORT=true still forces a background refresh after the app is already up.
if [ "${RUN_IMPORT:-false}" = "true" ] \
  || [ "${JOB_COUNT:-0}" -lt "${MIN_JOBS_BEFORE_IMPORT:-50}" ] \
  || [ "${MISSING_META:-9999}" -gt "${MAX_MISSING_JOB_META:-40}" ]; then
  echo "Importing jobs in background (full board / meta backfill)..."
  npx tsx scripts/import-jobs.ts || true
else
  echo "Skipping import — board already has ${JOB_COUNT} jobs with meta"
fi

wait "$APP_PID"
