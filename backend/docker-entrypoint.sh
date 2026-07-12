#!/bin/sh
set -eu

if [ "${WAIT_FOR_DATABASE:-true}" = "true" ]; then
  python - <<'PY'
import os
import socket
import time
from urllib.parse import urlparse

database_url = os.environ["DATABASE_URL"]
parsed = urlparse(database_url.replace("postgresql+psycopg://", "postgresql://", 1))
host = parsed.hostname
port = parsed.port or 5432
deadline = time.time() + int(os.environ.get("DATABASE_WAIT_TIMEOUT", "60"))

while True:
    try:
        with socket.create_connection((host, port), timeout=5):
            break
    except OSError:
        if time.time() > deadline:
            raise TimeoutError(f"Timed out waiting for database at {host}:{port}")
        time.sleep(2)
PY
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  alembic upgrade head
fi

exec "$@"
