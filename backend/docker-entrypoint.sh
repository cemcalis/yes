#!/bin/sh
set -e

# Ensure data dirs exist
mkdir -p /app/data /app/public/uploads

# Run migrations that are safe/idempotent
if [ -f /app/migrations/sqlite-add-updated-at-categories.js ]; then
  node /app/migrations/sqlite-add-updated-at-categories.js || true
fi
if [ -f /app/migrations/sqlite-add-size-requests.js ]; then
  node /app/migrations/sqlite-add-size-requests.js || true
fi

exec "$@"
