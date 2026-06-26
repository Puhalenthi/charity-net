# Charity Net

Connecting people, charities, and the world.

People post photos of items they want to give away. Nearby approved charities see those items on
a map, express interest within a 24-hour window, and chat directly with the giver. After 24h the
giver picks a recipient.

## Stack

- **Web client**: Vite + React + TypeScript + Tailwind + shadcn-style primitives (Firebase Hosting)
- **Server**: Node.js + Express + TypeScript (Cloud Run, Docker)
- **Database**: Firestore (geohash queries via `geofire-common`)
- **Auth**: Firebase Auth + custom claims (`role`, `approved`, `charityId`)
- **Storage**: Firebase Cloud Storage
- **Maps**: Google Maps JS API + marker clusterer
- **AI**: OpenAI Vision (controlled-vocabulary tags + safety flags)
- **Notifications**: in-app only (real-time "Alerts" feed in Firestore; no email)
- **One Cloud Function**: maintains `lastMessage` / unread counts on chat threads

## Repo layout (pnpm workspaces)

```
shared/     @charity-net/shared — zod schemas, enums, geo helpers, typed API client (RN-safe)
client/     React app
server/     Express API
functions/  the single Firestore-triggered Cloud Function
scripts/    set-admin, seed-emulator
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data model.

Deploying for the first time? Follow [docs/DEPLOY-FIRST-TIME.md](docs/DEPLOY-FIRST-TIME.md) —
a zero-to-live walkthrough. All Google Cloud setup is done in the browser console;
only the Firebase deploy (one step) uses a command line on your laptop. The shorter
[docs/DEPLOY.md](docs/DEPLOY.md) is the reference for ongoing deploys.

## Getting started

One command — installs deps, builds the shared package, copies `.env` files,
and opens three terminal windows (emulators, dev server, first-run seed):

```bash
corepack enable      # one-time, enables pnpm
pnpm start
```

That script (`scripts/start-dev.sh`) detects whichever terminal emulator you have
(gnome-terminal, konsole, alacritty, kitty, wezterm, foot, or xterm).

Emulator data persists to `.emulator-data/` on Ctrl-C, so subsequent runs skip
the seed. Delete that folder to re-seed.

### Manual alternative

```bash
pnpm install
pnpm --filter @charity-net/shared build
pnpm dev:emulators   # terminal 1
pnpm dev             # terminal 2 (shared watch + Express + Vite)
pnpm seed            # terminal 3, one-time
```

Demo accounts the seed creates:

| Email | Password | Role |
|---|---|---|
| `person@example.com` | `password123` | person |
| `charity@example.com` | `password123` | charity (pre-approved) |
| `admin@example.com` | `password123` | admin |

## Test plan

A manual end-to-end checklist lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#verification).

## Future iOS app

The `shared/` workspace package has no DOM or Node dependencies, so React Native (planned) will
reuse the schemas, enums, controlled tag vocab, geohash helpers, and typed API client as-is.
