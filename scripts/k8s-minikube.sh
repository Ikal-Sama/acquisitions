#!/bin/bash
# Deploy acquisitions to Minikube using the production Docker image and
# Neon Cloud (DATABASE_URL from .env.production — no Neon Local).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NAMESPACE="acquisitions"
IMAGE="acquisitions:prod"
ENV_FILE=".env.production"

usage() {
  cat <<'EOF'
Usage: ./scripts/k8s-minikube.sh [command]

Commands:
  up          Build image, load into Minikube, apply manifests, run migrations (default)
  up:local    Like up, but uses an in-cluster Postgres instead of Neon Cloud.
              No internet required — runs a local Postgres 16 in the cluster.
  down        Delete workloads (keeps namespace and secrets)
  status      Show pods, services, and the app URL
  logs        Tail application logs

Requires:
  - minikube, kubectl, docker
  - For 'up': .env.production with Neon Cloud DATABASE_URL (not neon-local)
  - For 'up:local': no .env.production needed (uses in-cluster Postgres)
  - node_modules on host (Dockerfile copies them at build time)
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Missing required command: $1"
    exit 1
  fi
}

load_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found."
    echo "   cp .env.production.example .env.production"
    echo "   Then set DATABASE_URL to your Neon Cloud pooled connection string."
    exit 1
  fi

  local env_tmp
  env_tmp="$(mktemp)"
  trap 'rm -f "$env_tmp"' RETURN

  # Neon URLs contain ? and & — bash `source` on .env breaks without quoting.
  node -e "
    import { config } from 'dotenv';
    import { writeFileSync } from 'fs';
    const parsed = config({ path: process.argv[1] }).parsed || {};
    const lines = Object.entries(parsed)
      .filter(([, value]) => value != null && value !== '')
      .map(([key, value]) => key + '=' + JSON.stringify(String(value)));
    writeFileSync(process.argv[2], lines.join('\n') + '\n');
  " "$ENV_FILE" "$env_tmp"

  set -a
  # shellcheck disable=SC1090
  source "$env_tmp"
  set +a

  if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ DATABASE_URL is empty in $ENV_FILE"
    exit 1
  fi

  if [[ "$DATABASE_URL" == *neon-local* ]] || [[ "$DATABASE_URL" == *@localhost* ]]; then
    echo "❌ DATABASE_URL points at a local proxy. Use your Neon Cloud URL instead."
    echo "   Example: postgres://...@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require"
    exit 1
  fi

  if [ -z "${ARCJET_KEY:-}" ]; then
    echo "❌ ARCJET_KEY is empty in $ENV_FILE"
    exit 1
  fi

  if [ -z "${JWT_SECRET:-}" ]; then
    echo "❌ JWT_SECRET is empty in $ENV_FILE"
    echo "   Add a strong random secret to $ENV_FILE before deploying."
    exit 1
  fi
}

ensure_minikube() {
  if ! minikube status >/dev/null 2>&1; then
    echo "🚀 Starting Minikube..."
    minikube start
  else
    echo "✅ Minikube is running"
  fi
}

build_image() {
  if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies (required for Docker build)..."
    npm ci
  fi

  echo "🐳 Building production image: $IMAGE"
  docker build --target runtime -t "$IMAGE" .
}

load_image() {
  echo "📥 Loading image into Minikube..."
  minikube image load "$IMAGE"
}

apply_base() {
  echo "📋 Applying namespace and config..."
  kubectl apply -f k8s/namespace.yaml
  kubectl apply -f k8s/configmap.yaml

  echo "🔐 Creating/updating secret from $ENV_FILE..."
  kubectl create secret generic acquisitions-secret \
    --namespace="$NAMESPACE" \
    --from-literal="DATABASE_URL=${DATABASE_URL}" \
    --from-literal="ARCJET_KEY=${ARCJET_KEY}" \
    --from-literal="JWT_SECRET=${JWT_SECRET}" \
    --dry-run=client -o yaml | kubectl apply -f -
}

run_migrations() {
  echo "📜 Running database migrations against Neon Cloud..."
  kubectl delete job acquisitions-migration \
    --namespace="$NAMESPACE" \
    --ignore-not-found=true

  kubectl apply -f k8s/migration-job.yaml

  if ! kubectl wait --for=condition=complete \
    --timeout=180s \
    job/acquisitions-migration \
    -n "$NAMESPACE"; then
    echo "❌ Migration job failed. Logs:"
    kubectl logs -n "$NAMESPACE" job/acquisitions-migration || true
    exit 1
  fi

  echo "✅ Migrations complete"
}

deploy_app() {
  echo "🚢 Deploying application..."
  kubectl apply -f k8s/deployment.yaml
  kubectl apply -f k8s/service.yaml

  kubectl rollout status deployment/acquisitions \
    --namespace="$NAMESPACE" \
    --timeout=180s
}

print_access() {
  echo ""
  echo "🎉 Acquisitions is running on Minikube (Neon Cloud database)"
  echo ""
  kubectl get pods,svc -n "$NAMESPACE"
  echo ""
  echo "Open the API:"
  echo "  minikube service acquisitions-service -n $NAMESPACE --url"
  echo ""
  echo "Or port-forward:"
  echo "  kubectl port-forward -n $NAMESPACE svc/acquisitions-service 3000:3000"
  echo "  curl http://localhost:3000/health"
}

cmd_up() {
  require_cmd minikube
  require_cmd kubectl
  require_cmd docker

  load_env
  ensure_minikube
  build_image
  load_image
  apply_base
  run_migrations
  deploy_app
  print_access
}

cmd_up_local() {
  require_cmd minikube
  require_cmd kubectl
  require_cmd docker

  ensure_minikube
  build_image
  load_image

  # Deploy in-cluster Postgres
  kubectl apply -f k8s/namespace.yaml
  echo "🐘 Deploying in-cluster Postgres..."
  kubectl apply -f k8s/postgres.yaml
  kubectl apply -f k8s/postgres-service.yaml

  echo "⏳ Waiting for Postgres to be ready..."
  if ! kubectl wait --for=condition=ready pod -l app=postgres \
    --namespace="$NAMESPACE" --timeout=120s; then
    echo "❌ Postgres failed to start. Logs:"
    kubectl logs -n "$NAMESPACE" -l app=postgres || true
    exit 1
  fi
  echo "✅ Postgres is ready"

  # Apply configmap (non-sensitive env vars)
  kubectl apply -f k8s/configmap.yaml

  # Create secret with only the keys needed locally (no DATABASE_URL)
  kubectl create secret generic acquisitions-secret \
    --namespace="$NAMESPACE" \
    --from-literal="ARCJET_KEY=${ARCJET_KEY:-local-dev-only}" \
    --from-literal="JWT_SECRET=${JWT_SECRET:-local-dev-only}" \
    --dry-run=client -o yaml | kubectl apply -f -

  # Run migrations using local Postgres
  echo "📜 Running migrations against in-cluster Postgres..."
  kubectl delete job acquisitions-migration \
    --namespace="$NAMESPACE" --ignore-not-found=true
  kubectl apply -f k8s/local/migration-job.yaml

  if ! kubectl wait --for=condition=complete \
    --timeout=60s \
    job/acquisitions-migration \
    -n "$NAMESPACE"; then
    echo "❌ Migration job failed. Logs:"
    kubectl logs -n "$NAMESPACE" job/acquisitions-migration || true
    exit 1
  fi
  echo "✅ Migrations complete"

  # Deploy the app pointing at local Postgres
  echo "🚢 Deploying application..."
  kubectl apply -f k8s/local/deployment.yaml
  kubectl apply -f k8s/service.yaml

  kubectl rollout status deployment/acquisitions \
    --namespace="$NAMESPACE" --timeout=180s

  print_access
  echo ""
  echo "📌 Using local in-cluster Postgres (no cloud dependencies)"
}

cmd_down() {
  kubectl delete -f k8s/service.yaml --ignore-not-found=true
  kubectl delete -f k8s/deployment.yaml --ignore-not-found=true
  kubectl delete -f k8s/migration-job.yaml --ignore-not-found=true
  echo "✅ Workloads removed (namespace, configmap, and secret kept)"
}

cmd_status() {
  kubectl get all -n "$NAMESPACE" 2>/dev/null || echo "Namespace $NAMESPACE not found. Run: ./scripts/k8s-minikube.sh up"
  echo ""
  minikube service acquisitions-service -n "$NAMESPACE" --url 2>/dev/null || true
}

cmd_logs() {
  kubectl logs -n "$NAMESPACE" -l app=acquisitions -f --tail=100
}

COMMAND="${1:-up}"

case "$COMMAND" in
  up) cmd_up ;;
  up:local) cmd_up_local ;;
  down) cmd_down ;;
  status) cmd_status ;;
  logs) cmd_logs ;;
  -h | --help | help) usage ;;
  *)
    echo "Unknown command: $COMMAND"
    usage
    exit 1
    ;;
esac
