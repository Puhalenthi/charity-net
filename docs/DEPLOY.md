# Deployment

## Day-to-day flow

| Change | How it ships |
|---|---|
| Anything under `server/**` or `shared/**` | `git push origin master` — Cloud Run's GitHub integration rebuilds the root `Dockerfile` and rolls out a new Cloud Run revision automatically. |
| Anything under `client/**`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `functions/**` | Run `pnpm deploy` locally (alias for `pnpm deploy:client`). |
| Both at once | Same: `git push` for the server, `pnpm deploy` for the client. They're independent. |

For the **first-time setup** (account, billing, secrets, connecting the GitHub
repo to Cloud Run), follow [DEPLOY-FIRST-TIME.md](./DEPLOY-FIRST-TIME.md). That
guide does all Google Cloud work in the **console** (no CLI) and uses the command
line only for the Firebase deploy. This file is the short-form reference once
everything is wired.

## Projects

Two Firebase projects — one staging, one prod — wired in `.firebaserc`:

```json
{
  "projects": {
    "default": "charity-net-dev",
    "production": "charity-net-prod"
  }
}
```

Switch with `firebase use default` / `firebase use production`.

## Secrets

Use Google Secret Manager, mounted as Cloud Run env vars. Never commit them.

| Secret | Used by |
|---|---|
| `OPENAI_API_KEY` | Server (OpenAI Vision) |
| `GOOGLE_MAPS_SERVER_KEY` | Server (`/geocode` proxy) |
| `JOB_SECRET` | Server (Cloud Scheduler header) |

Notifications are in-app only (the "Alerts" feed, backed by Firestore) — there is
no email channel and nothing email-related to configure.

The client only needs the Firebase web config (`VITE_FIREBASE_*`) and the Google Maps **browser** key
(`VITE_GOOGLE_MAPS_KEY`). Those are inlined at build time and are public.

## Cloud Run service (CI/CD via the GitHub integration)

The Cloud Run service `charity-net-api` is set up with **Continuously deploy from
a repository**. On every push to `main`, Cloud Run (via Cloud Build under the
hood) builds the root `Dockerfile` from the repo root, stores the image in Artifact
Registry, and rolls out a new revision. Runtime env vars and secrets are set on
the service itself (Cloud Run → service → **Variables & Secrets**), not in a
build file.

The image runs as the project's default Compute service account, which already has
Application Default Credentials for firebase-admin — no JSON key in the container.

Setup is documented in [DEPLOY-FIRST-TIME.md](./DEPLOY-FIRST-TIME.md#phase-j--deploy-the-server-to-cloud-run-auto-built-from-github-web).

### Manual fallback (advanced)

`cloudbuild.yaml` is **not** used by the GitHub integration. It exists only for a
manual build from your working tree, if you ever need one and have `gcloud`:

```bash
pnpm run deploy:server:manual    # gcloud builds submit --config cloudbuild.yaml .
```

Note: the manual build sets env vars via `cloudbuild.yaml` substitutions, while
the normal pipeline reads them from the Cloud Run service config — keep the two in
sync if you rely on the fallback.

## Firebase Hosting + Firestore + Storage + Functions (manual from your laptop)

```bash
pnpm deploy            # alias for deploy:client below
# expands to:
pnpm --filter @charity-net/shared build
pnpm --filter @charity-net/client build
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage,functions
```

`firebase.json` rewrites `/api/**` to the `charity-net-api` Cloud Run service so the client is served
from one origin and never has to hard-code the API URL.

## Cloud Scheduler

One job every 30 minutes to expire interest windows. Easiest to create in the
**Cloud Scheduler console** (see DEPLOY-FIRST-TIME.md Phase M). The CLI
equivalent, for reference:

```bash
gcloud scheduler jobs create http expire-interest-windows \
  --schedule="every 30 minutes" \
  --uri="https://charity-net-prod.web.app/api/jobs/expire-interest-windows" \
  --http-method=POST \
  --headers="x-job-secret=<JOB_SECRET>"
```

## Backups

```bash
gcloud firestore export gs://charity-net-prod-backups/$(date +%F)
```

Wire as a daily Cloud Scheduler → Cloud Run job for production.

## Local dev

```bash
pnpm dev:emulators   # auth, firestore, storage on 9099 / 8081 / 9199
pnpm dev             # shared (watch), server, client concurrently
```

The Vite dev server proxies `/api` → `http://localhost:8080` (the local Express server). With
emulators running, the client uses the auth/firestore/storage emulators automatically when
`VITE_USE_EMULATORS=true`.
