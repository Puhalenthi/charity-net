#!/usr/bin/env bash
# Deploy Charity Net to production.
#
#   Client -> Firebase Hosting (the website you see in the browser)
#   Server -> Cloud Run        (the /api backend)
#
# Usage:
#   ./scripts/deploy.sh            # deploy both: client, then server
#   ./scripts/deploy.sh client     # website only  (the usual one — most changes are client-only)
#   ./scripts/deploy.sh server     # API only
#
# The website is NOT on Cloud Run. A UI change goes live via the client deploy
# (Firebase Hosting), not by rebuilding the server. Only deploy the server when
# code under server/ or shared/ actually changed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PROJECT="charity-net-c4474"
REGION="europe-west1"
SERVICE="charity-net"        # the Cloud Run service Firebase Hosting rewrites /api/** to
TARGET="${1:-all}"

green() { printf '\033[1;32m%s\033[0m\n' "$*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing prerequisite: $1 ($2)"; exit 1; }
}

deploy_client() {
  need pnpm     "corepack enable"
  need firebase "npm i -g firebase-tools"
  green "==> Client: building shared + client…"
  pnpm --filter @charity-net/shared build
  pnpm --filter @charity-net/client build
  green "==> Client: deploying to Firebase Hosting (+ rules, indexes, storage, functions)…"
  firebase deploy \
    --project "$PROJECT" \
    --only hosting,firestore:rules,firestore:indexes,storage,functions
  green "==> Client live: https://$PROJECT.web.app  (hard-refresh with Ctrl-Shift-R)"
}

deploy_server() {
  need gcloud "https://cloud.google.com/sdk/docs/install"
  green "==> Server: building the root Dockerfile and rolling out a new Cloud Run revision ($SERVICE)…"
  # --source . builds the Dockerfile via Cloud Build and deploys a new revision.
  # Env vars and secrets already set on the service are preserved automatically.
  gcloud run deploy "$SERVICE" \
    --source . \
    --project "$PROJECT" \
    --region "$REGION" \
    --quiet
  green "==> Server deployed. Serving revision:"
  gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" \
    --format="value(status.latestReadyRevisionName)"
}

case "$TARGET" in
  client) deploy_client ;;
  server) deploy_server ;;
  all)    deploy_client; deploy_server ;;
  *)      echo "usage: $0 [client|server|all]"; exit 2 ;;
esac

green "==> Done ($TARGET)."
