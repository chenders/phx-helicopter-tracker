#!/usr/bin/env bash
#
# Deploy the latest code: pull, then rebuild-only-if-changed and (re)start containers.
#
# Why not `docker compose restart`? `restart` reuses the existing image, so after a
# `git pull` it serves STALE code in production mode (where the frontend `dist/` is baked
# into the image at build time). `docker compose up -d --build` instead lets Docker's
# layer cache decide what to rebuild: if source changed, the affected layers (and only
# those) rebuild and the container is recreated; if nothing changed, every layer is a
# cache hit, the image digest is identical, and `up -d` is a no-op. So this is safe to
# run on every deploy — a true rebuild when needed, a fast no-op when not.
#
# Usage:
#   ./scripts/deploy.sh                # pull + rebuild/restart all services
#   ./scripts/deploy.sh frontend       # only the frontend service
#   ./scripts/deploy.sh frontend backend
#
# Compose file selection honors the standard COMPOSE_FILE env var, e.g. for a prod host:
#   export COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml
# (set it in your shell profile or a .env that your shell sources).
#
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> git pull --ff-only"
git pull --ff-only

echo "==> docker compose up -d --build ${*:-(all services)}"
docker compose up -d --build "$@"

echo "==> current state"
docker compose ps

echo "==> deploy complete"
