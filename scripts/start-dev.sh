#!/usr/bin/env bash
# Boot the entire Charity Net dev stack in the CURRENT terminal: install/build,
# then run the emulators, the dev servers (shared watch / Express / Vite) and a
# one-time seed together via `concurrently` — colored, prefixed, one pane.
#
# Ctrl-C stops everything. Sign in with the seeded email/password accounts
# (person@charitynet.com / charity@charitynet.com / admin@charitynet.com, all password123).
#
# Usage: ./scripts/start-dev.sh     (or `pnpm start` from the repo root)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
EMU_DATA_DIR="$REPO_ROOT/.emulator-data"
DEV_PROJECT="charity-net-dev"   # must match client/.env.local, server/.env and the seed

# ---- colors -----------------------------------------------------------------
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*"; }

# ---- prerequisites ----------------------------------------------------------
need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    red "Missing prerequisite: $1"
    echo "  → $2"
    exit 1
  fi
}
need node     "Install Node 20+  (nvm install 20 && nvm use 20)"
need pnpm     "Enable pnpm       (corepack enable)"
need firebase "Install the CLI   (npm i -g firebase-tools)"
need java     "Install a JDK 11+ (required by the Firestore emulator)"

# ---- env files --------------------------------------------------------------
if [[ ! -f client/.env.local ]]; then
  cp client/.env.example client/.env.local
  yellow "Created client/.env.local — fill in VITE_GOOGLE_MAPS_KEY to enable the map"
fi
if [[ ! -f server/.env ]]; then
  cp server/.env.example server/.env
  yellow "Created server/.env — fill in OPENAI_API_KEY (or set AI_ENABLED=false)"
fi

# ---- clear leftover processes from a previous run (make start idempotent) ---
# Two failure modes this prevents:
#   • a dev:shared tsc watch left running races the one-time shared build below
#     (tsc exits 1 with no message)
#   • an emulator Java child (or a dev server/vite) that outlived its terminal
#     squats a port ("port taken" / EADDRINUSE)
#
# Anything with a port (server 8080, vite 5173, emulators) is killed by port via
# lsof — precise, and can never match this script itself. The pattern-matched
# kills are anchored to $REPO_ROOT so unrelated projects are never hit. The
# server's `tsx watch` supervisor has no port of its own but respawns the child
# on 8080, so it must be killed by pattern too.
green "Clearing any leftover dev/emulator processes from a previous run…"
pkill -9 -f "$REPO_ROOT/(shared|server|client)/node_modules/.*typescript/bin/tsc" 2>/dev/null || true
pkill -9 -f "$REPO_ROOT/node_modules/.*concurrently"                              2>/dev/null || true
pkill -9 -f "$REPO_ROOT/server/node_modules/.*tsx/dist/cli.mjs"                   2>/dev/null || true
if command -v lsof >/dev/null 2>&1; then
  # `|| true`: lsof exits non-zero when nothing holds the ports, which under
  # `set -euo pipefail` would otherwise abort the script on this assignment.
  # Each port needs its own -i; extra bare `tcp:PORT` args are read as filenames,
  # not port selectors, so a single -i with a list silently matches nothing.
  HELD=$(lsof -t -i tcp:5173 -i tcp:8080 -i tcp:8081 -i tcp:9099 -i tcp:9199 -i tcp:4000 -i tcp:4400 -i tcp:4500 2>/dev/null | sort -u) || true
  if [[ -n "$HELD" ]]; then
    # shellcheck disable=SC2086
    kill -9 $HELD 2>/dev/null || true
  fi
fi
sleep 1

# ---- install + build shared (so server's tsx watch can resolve it) ----------
green "Installing dependencies (pnpm install)…"
pnpm install

green "Building @charity-net/shared (one-time, dev:shared watches afterward)…"
pnpm --filter @charity-net/shared build

# ---- emulator command --------------------------------------------------------
# Pin the emulator to the dev project explicitly. `firebase emulators:start`
# otherwise uses the active `firebase use` alias — which may be production —
# while the client, server and seed all use charity-net-dev. A mismatch means
# the app writes to one project namespace and the emulator serves another.
mkdir -p "$EMU_DATA_DIR"
HAS_EMU_DATA=false
if [[ -f "$EMU_DATA_DIR/firebase-export-metadata.json" ]]; then
  HAS_EMU_DATA=true
fi

EMU_CMD="firebase emulators:start --project $DEV_PROJECT --only auth,firestore,storage --export-on-exit='$EMU_DATA_DIR'"
if $HAS_EMU_DATA; then
  EMU_CMD="$EMU_CMD --import='$EMU_DATA_DIR'"
fi

# ---- run everything in THIS terminal ----------------------------------------
NAMES="emu,dev"
COLORS="blue,cyan"
CMDS=("$EMU_CMD" "pnpm dev")

if $HAS_EMU_DATA; then
  yellow "Re-using existing emulator data in ./.emulator-data (delete it to re-seed)."
else
  # The seed waits for BOTH Firestore (:8081) and Auth (:9099) — Auth binds a
  # moment after Firestore, and seeding it too early fails with ECONNREFUSED.
  SEED_CMD="until curl -sf http://127.0.0.1:8081 >/dev/null 2>&1 && curl -sf http://127.0.0.1:9099 >/dev/null 2>&1; do sleep 1; done; \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIREBASE_PROJECT_ID=$DEV_PROJECT \
pnpm --filter @charity-net/scripts seed"
  NAMES="$NAMES,seed"
  COLORS="$COLORS,green"
  CMDS+=("$SEED_CMD")
fi

cat <<EOF

  App:          http://localhost:5173
  API:          http://localhost:8080
  Emulator UI:  http://localhost:4000

  Email/password accounts (seeded on first run):
    person@charitynet.com   / password123
    charity@charitynet.com  / password123
    admin@charitynet.com    / password123

EOF

green "Starting the stack (Ctrl-C stops everything)…"
echo
# `exec` so Ctrl-C reaches concurrently directly. We deliberately do NOT pass
# --kill-others: the seed exits 0 when done and must not take the others down.
# --kill-signal SIGINT makes concurrently forward SIGINT (not its default
# SIGTERM) so the emulator attempts its --export-on-exit. With the whole stack
# sharing one Ctrl-C the export is best-effort — if it doesn't complete, the
# next run simply re-seeds (a few seconds).
exec "$REPO_ROOT/node_modules/.bin/concurrently" \
  --names "$NAMES" --prefix-colors "$COLORS" \
  --kill-signal SIGINT \
  "${CMDS[@]}"
