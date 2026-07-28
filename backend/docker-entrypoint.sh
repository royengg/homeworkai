#!/bin/sh
set -eu

if [ "${RUN_DATABASE_SYNC:-false}" = "true" ]; then
  attempt=1
  max_attempts=15

  while ! ./node_modules/.bin/prisma db push --skip-generate; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Database schema synchronization failed after $attempt attempts." >&2
      exit 1
    fi

    echo "Database is unavailable; retrying schema synchronization ($attempt/$max_attempts)..." >&2
    attempt=$((attempt + 1))
    sleep 2
  done
fi

exec "$@"
