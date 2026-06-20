# First-time deploy — zero to live, all via the web

This walkthrough assumes you have **nothing** set up: no GCP project, no Firebase,
no OpenAI account, no installed CLIs. Everything happens in a browser tab plus
**Google Cloud Shell** (Google's built-in web terminal).

Two free things you do need first:

- A **Google account**.
- A **GitHub account**.

Credit-card moments are called out in **bold**. There are two:
**Phase C** (GCP billing) and **Phase F** (OpenAI). Google won't charge you while
you stay in the free tier — new accounts get $300 of credit for 90 days.

---

## Phase A — Push the code to GitHub (your laptop, one time)

This is the only step you can't do in the browser. Run it once from the repo on
your laptop. After this you'll never use your laptop terminal again.

```bash
cd ~/GitHub/charity-net
gh auth login                                                    # follow prompts
gh repo create charity-net --private --source=. --remote=origin --push
```

No `gh` CLI? Create the repo manually at https://github.com/new (private, name
it `charity-net`), then:

```bash
git remote add origin https://github.com/YOUR_USER/charity-net.git
git add . && git commit -m "Initial Charity Net code" && git push -u origin main
```

---

## Phase B — Create the Firebase + GCP project (web)

1. Go to https://console.firebase.google.com → **Add project**.
2. Name it `Charity Net`. Disable Google Analytics for now → **Create project**.

Firebase auto-creates the matching GCP project. Note the **project ID**
(something like `charity-net-12345`). You'll need it many times.

---

## Phase C — 💳 CREDIT CARD #1: enable Blaze plan (web)

This unlocks Cloud Run, Cloud Functions, and Hosting rewrites.

3. Bottom-left of the Firebase console: **Spark plan** → **Upgrade to Blaze**.
4. **Set up billing account** → enter card.
5. On the "Set a budget" step, set $20/month. You'll get email alerts at
   50/90/100% of budget.

---

## Phase D — Turn on the services (web, Firebase console)

6. **Firestore Database** → Create database → **Native mode** → pick a region
   (e.g. `europe-west1` or `us-central1`). **The region is permanent.** Pick
   close to your users.
7. **Storage** → Get started → **same region** as Firestore.
8. **Authentication** → Get started:
   - **Email/Password** → Enable → Save.
   - **Google** → Enable → set support email → Save.

---

## Phase E — Get the Firebase web config (web)

9. ⚙️ → Project settings → "Your apps" → click `</>` → register name
   `Charity Net Web` → **skip** the Hosting setup step → copy the six values:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`,
   `appId`. You'll paste these in Phase L.

---

## Phase F — 💳 CREDIT CARD #2: OpenAI (web)

10. https://platform.openai.com → sign up.
11. Settings → Billing → Add payment method → top up $5 (or enable auto-recharge
    at $10).
12. API keys → **Create new secret key** → name `Charity Net` → **copy now,
    you cannot view it again**.

A gpt-4o vision scan of an item costs about $0.01.

---

## Phase G — Google Maps keys (web, uses your GCP card — no new card)

13. https://console.cloud.google.com → top bar, select your `charity-net`
    project.
14. APIs & Services → Library → enable **Maps JavaScript API** and
    **Geocoding API** (one click each).
15. APIs & Services → Credentials → **+ Create credentials → API key** —
    do this **twice**:
    - **Maps Browser key**: click into it → Application restrictions: HTTP
      referrers → add `http://localhost:5173/*`. (You'll add the live URL in
      Phase O once it exists.) API restrictions → Maps JavaScript API only →
      Save.
    - **Maps Server key**: Application restrictions: None (for now).
      API restrictions: Geocoding API only → Save.
16. Copy both keys. Maps gives you $200/month free — you'll likely never pay.

---

## Phase H — SendGrid (web, free)

17. https://sendgrid.com → sign up.
18. Settings → API Keys → Create API Key → "Full Access" → copy.
19. Settings → Sender Authentication → Single Sender Verification → verify a
    real email address (e.g. `you@your-domain.com`). Note it — that's your
    `EMAIL_FROM` value.

---

## Phase I — Open Cloud Shell (the web terminal)

20. In https://console.cloud.google.com, click the **>_** icon at the top right.
    Cloud Shell opens at the bottom of the page. It has `gcloud`, `node 20`,
    `git`, and `gh` preinstalled, plus 5 GB of persistent storage.

In Cloud Shell:

```bash
corepack enable                          # enables pnpm
npm install -g firebase-tools            # one-time, persists across sessions

gh auth login                            # paste the device code into your browser
gh repo clone YOUR_USER/charity-net
cd charity-net
pnpm install
```

---

## Phase J — Put your secrets in Secret Manager (Cloud Shell)

21. Replace each `<...>` with the keys you copied earlier:

```bash
PROJECT_ID=$(gcloud config get-value project)

gcloud services enable \
  secretmanager.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com cloudfunctions.googleapis.com \
  eventarc.googleapis.com firestore.googleapis.com \
  firebasestorage.googleapis.com identitytoolkit.googleapis.com

echo -n "<openai-key>"       | gcloud secrets create openai-key       --data-file=-
echo -n "<sendgrid-key>"     | gcloud secrets create sendgrid-key     --data-file=-
echo -n "<gmaps-server-key>" | gcloud secrets create gmaps-server-key --data-file=-
openssl rand -hex 32         | gcloud secrets create cron-job-secret  --data-file=-

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for s in openai-key sendgrid-key gmaps-server-key cron-job-secret; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" --quiet
done
```

---

## Phase K — Deploy the server to Cloud Run (Cloud Shell)

22. Use the same region you picked for Firestore. First deploy takes ~5 minutes
    (Cloud Build creates the Docker image):

```bash
gcloud run deploy charity-net-api \
  --source server \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 1 \
  --concurrency 40 \
  --set-secrets OPENAI_API_KEY=openai-key:latest,SENDGRID_API_KEY=sendgrid-key:latest,GOOGLE_MAPS_SERVER_KEY=gmaps-server-key:latest,JOB_SECRET=cron-job-secret:latest \
  --set-env-vars FIREBASE_PROJECT_ID=${PROJECT_ID},FIREBASE_STORAGE_BUCKET=${PROJECT_ID}.appspot.com,EMAIL_FROM=<your-verified-sendgrid-sender>,ALLOWED_ORIGINS=https://${PROJECT_ID}.web.app
```

When it finishes it prints a `*.run.app` URL. You don't need to touch it —
Firebase Hosting will rewrite `/api/**` to that service.

---

## Phase L — Build and deploy the client + rules + functions (Cloud Shell)

23. Make the prod env file using the Firebase config from Phase E and the
    **browser** Maps key from Phase G:

```bash
cat > client/.env.production <<EOF
VITE_FIREBASE_API_KEY=<apiKey-from-phase-E>
VITE_FIREBASE_AUTH_DOMAIN=${PROJECT_ID}.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=${PROJECT_ID}
VITE_FIREBASE_STORAGE_BUCKET=${PROJECT_ID}.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<from-phase-E>
VITE_FIREBASE_APP_ID=<from-phase-E>
VITE_GOOGLE_MAPS_KEY=<maps-browser-key-from-phase-G>
VITE_API_BASE_URL=/api
VITE_USE_EMULATORS=false
EOF
```

24. Point Firebase at your real project ID:

```bash
sed -i "s/charity-net-prod/${PROJECT_ID}/" .firebaserc
```

25. If you used a region other than `europe-west1`, update `firebase.json`:

```bash
sed -i 's/europe-west1/YOUR_REGION/g' firebase.json
```

26. Log in and deploy:

```bash
firebase login --no-localhost   # follow the device-code link
firebase use production
pnpm --filter @charity-net/shared build
pnpm --filter @charity-net/client build
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage,functions
```

When it finishes it prints:

> `Hosting URL: https://YOUR_PROJECT.web.app`

That's your live app.

---

## Phase M — Make yourself admin (Cloud Shell)

27. Open `https://YOUR_PROJECT.web.app` in another tab → sign up with your real
    email and a password. This creates your Firebase Auth user.
28. Back in Cloud Shell:

```bash
FIREBASE_PROJECT_ID=${PROJECT_ID} \
  pnpm --filter @charity-net/scripts set-admin you@your-email.com
```

29. In the app tab: sign out, sign back in. You'll now see `/admin/approvals`
    in the nav.

---

## Phase N — Schedule the interest-window expiry cron (Cloud Shell)

30. ```bash
    JOB_SECRET=$(gcloud secrets versions access latest --secret=cron-job-secret)
    gcloud scheduler jobs create http expire-interest-windows \
      --location europe-west1 \
      --schedule "every 30 minutes" \
      --uri "https://${PROJECT_ID}.web.app/api/jobs/expire-interest-windows" \
      --http-method POST \
      --headers "x-job-secret=${JOB_SECRET}"
    ```

If Google prompts you to enable the Scheduler API or create an App Engine app
for the region, say yes. Both are one-time and free.

---

## Phase O — Lock down the Maps browser key (web)

You couldn't restrict the live URL before because it didn't exist yet.

31. https://console.cloud.google.com → APIs & Services → Credentials → click
    your **Maps Browser key** → HTTP referrers → add
    `https://YOUR_PROJECT.web.app/*` → Save.

---

## Phase P — Smoke test (web)

32. Open `https://YOUR_PROJECT.web.app`:
    - Sign up a second account as a **Person** → post an item with a real photo
      → tags should appear within ~10 seconds (the AI scan).
    - Sign up a third account as a **Charity** → switch to your admin →
      `/admin/approvals` → approve.
    - Sign back in as the charity → map shows the item → **Express Interest** →
      open chat → send a message.

If something looks off, in Cloud Shell:

```bash
gcloud run services logs read charity-net-api --region europe-west1 --limit 50
firebase functions:log
```

---

## Future deploys (Cloud Shell, ~2 minutes)

Each time you push new code to GitHub from your laptop:

```bash
cd charity-net && git pull && pnpm install

# server changes
gcloud run deploy charity-net-api --source server --region europe-west1

# client / rules / functions changes
pnpm --filter @charity-net/client build && \
  firebase deploy --only hosting,firestore:rules,firestore:indexes,storage,functions
```

When you want this fully automated (push to `main` → deploy), add a GitHub
Actions workflow that runs the same two commands using a service-account
credential and a Firebase token.
