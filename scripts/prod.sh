#!/bin/bash

# Production deployment script for Acquisition App
# Builds, starts, verifies health, and migrates the production stack.
# Connects DIRECTLY to Neon Cloud (no local proxy).

set -euo pipefail

echo "🚀 Starting Acquisition App in Production Mode"
echo "==============================================="

# --- Pre-flight checks -------------------------------------------------------
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found!"
    echo "   Please create .env.production with your production environment variables."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "   Please start Docker and try again."
    exit 1
fi

# Pin the compose project name so subsequent 'docker compose' commands find it
# regardless of CWD (useful in CI).
export COMPOSE_PROJECT_NAME=acquisitions-prod

# --- Build & start container -------------------------------------------------
echo "📦 Building production image..."
docker compose -f docker-compose.prod.yml --env-file .env.production build

echo "🚢 Starting production container..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# --- Wait for healthy --------------------------------------------------------
CONTAINER_NAME="acquisitions-app-prod"
echo "⏳ Waiting for $CONTAINER_NAME to become healthy..."

STATUS=""
for i in $(seq 1 30); do
    STATUS=$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "missing")
    if [ "$STATUS" = "healthy" ]; then
        echo "✅ Container is healthy."
        break
    fi
    if [ "$STATUS" = "unhealthy" ]; then
        echo "❌ Container is unhealthy. Last 40 log lines:"
        docker logs --tail 40 "$CONTAINER_NAME"
        exit 1
    fi
    sleep 2
done

if [ "$STATUS" != "healthy" ]; then
    echo "❌ Container did not become healthy in time. Last 40 log lines:"
    docker logs --tail 40 "$CONTAINER_NAME"
    exit 1
fi

# --- Migrations --------------------------------------------------------------
# Run Drizzle migrations from the HOST against the production Neon Cloud DB.
# drizzle.config.js loads .env via dotenv, so we source .env.production
# explicitly to make sure DATABASE_URL points at the prod DB.
echo "📜 Applying latest schema with Drizzle (against Neon Cloud)..."
set -a
# shellcheck disable=SC1091
source .env.production
set +a
npm run db:migrate

# --- Summary -----------------------------------------------------------------
echo ""
echo "🎉 Production environment started!"
echo "   Application: http://localhost:3000"
echo "   Logs:        docker logs -f $CONTAINER_NAME"
echo ""
echo "Useful commands:"
echo "   View logs: docker logs -f $CONTAINER_NAME"
echo "   Stop app:  docker compose -f docker-compose.prod.yml down"
