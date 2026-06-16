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
- **Email**: SendGrid
- **One Cloud Function**: maintains `lastMessage` / unread counts on chat threads

## Repo layout (pnpm workspaces)

```
shared/     @charity-net/shared — zod schemas, enums, geo helpers, typed API client (RN-safe)
client/     React app
server/     Express API
functions/  the single Firestore-triggered Cloud Function
scripts/    set-admin, seed-emulator
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data model, [docs/DEPLOY.md](docs/DEPLOY.md)
for production setup.

## Getting started

```bash
corepack enable
pnpm install

cp client/.env.example client/.env.local
cp server/.env.example server/.env

# Terminal 1 — emulators
pnpm dev:emulators

# Terminal 2 — server, client, shared (one command)
pnpm dev
```

In a third terminal once emulators are up:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_PROJECT_ID=charity-net-dev \
pnpm --filter @charity-net/scripts seed
```

The seed prints test accounts (person / charity / admin) you can sign in with.

## Test plan

A manual end-to-end checklist lives in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#verification).

## Future iOS app

The `shared/` workspace package has no DOM or Node dependencies, so React Native (planned) will
reuse the schemas, enums, controlled tag vocab, geohash helpers, and typed API client as-is.
