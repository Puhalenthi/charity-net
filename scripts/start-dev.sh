#!/usr/bin/env bash
# Boot the entire Charity Net dev stack: install/build, then open three terminal windows
# (emulators, dev server, optional first-run seed).
#
# Usage: ./scripts/start-dev.sh     (or `pnpm start` from the repo root)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
EMU_DATA_DIR="$REPO_ROOT/.emulator-data"

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

# ---- detect a terminal emulator we can open windows in ----------------------
TERM_EMU=""
for t in gnome-terminal konsole alacritty kitty wezterm foot xterm; do
  if command -v "$t" >/dev/null 2>&1; then
    TERM_EMU="$t"
    break
  fi
done
if [[ -z "$TERM_EMU" ]]; then
  red "No supported terminal emulator found."
  echo "  Tried: gnome-terminal, konsole, alacritty, kitty, wezterm, foot, xterm"
  exit 1
fi
green "Terminal emulator: $TERM_EMU"

# Launch a command in a new terminal window, leaving it open after the command exits.
launch() {
  local title="$1" cmd="$2"
  local wrapped="cd '$REPO_ROOT'; $cmd; status=\$?; echo; echo '--- $title exited (status '\$status'). Press enter to close. ---'; read"
  case "$TERM_EMU" in
    gnome-terminal)
      gnome-terminal --title="$title" -- bash -lc "$wrapped" >/dev/null 2>&1 &
      ;;
    konsole)
      konsole -p "tabtitle=$title" -e bash -lc "$wrapped" >/dev/null 2>&1 &
      ;;
    wezterm)
      wezterm start -- bash -lc "$wrapped" >/dev/null 2>&1 &
      ;;
    kitty|alacritty|foot|xterm)
      "$TERM_EMU" -e bash -lc "$wrapped" >/dev/null 2>&1 &
      ;;
  esac
  disown || true
}

# ---- env files --------------------------------------------------------------
if [[ ! -f client/.env.local ]]; then
  cp client/.env.example client/.env.local
  yellow "Created client/.env.local — fill in VITE_FIREBASE_* and VITE_GOOGLE_MAPS_KEY"
fi
if [[ ! -f server/.env ]]; then
  cp server/.env.example server/.env
  yellow "Created server/.env — fill in OPENAI_API_KEY (and SENDGRID/GMAPS if you have them)"
fi

# ---- install + build shared (so server's tsx watch can resolve it) ----------
green "Installing dependencies (pnpm install)…"
pnpm install

green "Building @charity-net/shared (one-time, dev:shared watches afterward)…"
pnpm --filter @charity-net/shared build

# ---- decide whether the emulator needs to import existing data --------------
mkdir -p "$EMU_DATA_DIR"
HAS_EMU_DATA=false
if [[ -f "$EMU_DATA_DIR/firebase-export-metadata.json" ]]; then
  HAS_EMU_DATA=true
fi

if $HAS_EMU_DATA; then
  EMU_CMD="firebase emulators:start --only auth,firestore,storage --import='$EMU_DATA_DIR' --export-on-exit='$EMU_DATA_DIR'"
else
  EMU_CMD="firebase emulators:start --only auth,firestore,storage --export-on-exit='$EMU_DATA_DIR'"
fi

# ---- launch terminals -------------------------------------------------------
green "Launching emulator window…"
launch "charity-net: emulators" "$EMU_CMD"

green "Waiting for Firestore emulator on :8081…"
for _ in $(seq 1 40); do
  if curl -sf http://127.0.0.1:8081 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

green "Launching dev window (shared watch / Express server / Vite)…"
launch "charity-net: dev" "pnpm dev"

if $HAS_EMU_DATA; then
  yellow "Skipping seed — re-using existing data in ./.emulator-data (delete that folder to re-seed)."
else
  green "First run — seeding demo data in a third window…"
  SEED_CMD="FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_PROJECT_ID=charity-net-dev \
pnpm --filter @charity-net/scripts seed"
  launch "charity-net: seed" "$SEED_CMD"
fi

cat <<EOF

$(green "All windows launched.")
  App:          http://localhost:5173
  API:          http://localhost:8080
  Emulator UI:  http://localhost:4000

EOF

if ! $HAS_EMU_DATA; then
  cat <<EOF
Demo accounts (printed by the seed window once it finishes):
  person@example.com   / password123
  charity@example.com  / password123
  admin@example.com    / password123

Emulator data is auto-saved to .emulator-data/ when you Ctrl-C the emulator window,
so the next run skips the seed.
EOF
fi
