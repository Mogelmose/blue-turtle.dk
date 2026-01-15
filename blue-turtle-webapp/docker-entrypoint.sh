#!/bin/sh
set -e

UPLOAD_ROOT_PATH=${UPLOAD_ROOT:-/uploads}
mkdir -p "$UPLOAD_ROOT_PATH" || echo "UPLOAD_ROOT is not writable: $UPLOAD_ROOT_PATH"

mkdir -p /app/.next/cache/images || echo "Next cache dir is not writable: /app/.next/cache/images"

node /prisma-cli/node_modules/prisma/build/index.js migrate deploy

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node server.js
