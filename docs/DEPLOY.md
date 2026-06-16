# Deployment

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
| `SENDGRID_API_KEY` | Server (email) |
| `GOOGLE_MAPS_SERVER_KEY` | Server (`/geocode` proxy) |
| `JOB_SECRET` | Server (Cloud Scheduler header) |

The client only needs the Firebase web config (`VITE_FIREBASE_*`) and the Google Maps **browser** key
(`VITE_GOOGLE_MAPS_KEY`). Those are inlined at build time and are public.

## Cloud Run service

```bash
gcloud run deploy charity-net-api \
  --source server \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --concurrency 40 \
  --set-secrets OPENAI_API_KEY=openai-key:latest,SENDGRID_API_KEY=sendgrid-key:latest,GOOGLE_MAPS_SERVER_KEY=gmaps-server-key:latest,JOB_SECRET=cron-job-secret:latest \
  --set-env-vars FIREBASE_PROJECT_ID=charity-net-prod,FIREBASE_STORAGE_BUCKET=charity-net-prod.appspot.com,EMAIL_FROM=no-reply@charity.net,ALLOWED_ORIGINS=https://charity-net-prod.web.app
```

Uses Application Default Credentials for firebase-admin — no service-account JSON in the container.

## Firebase Hosting + Firestore + Storage + Functions

```bash
pnpm --filter @charity-net/client build
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage,functions
```

`firebase.json` rewrites `/api/**` to the `charity-net-api` Cloud Run service so the client is served
from one origin and never has to hard-code the API URL.

## Cloud Scheduler

One job per day to expire interest windows:

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
