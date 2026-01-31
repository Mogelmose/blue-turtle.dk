#!/bin/sh
set -e

UPLOAD_ROOT_PATH=${DEV_UPLOAD_ROOT:-/uploads}
mkdir -p "$UPLOAD_ROOT_PATH" || echo "DEV_UPLOAD_ROOT is not writable: $UPLOAD_ROOT_PATH"

mkdir -p /app/.next/cache/images || echo "Next cache dir is not writable: /app/.next/cache/images"

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ "${RUN_WORKER:-true}" = "true" ]; then
  node src/worker/runJobs.js &
fi

exec node server.js
