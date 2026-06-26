# First-time deploy — zero to live

This walkthrough assumes you have **nothing** set up: no GCP project, no Firebase,
no OpenAI account, no installed CLIs.

**Almost everything happens in your browser** — the Firebase console and the
Google Cloud console, by pointing and clicking. **Exactly one step** (Phase K,
deploying the website) uses a command line, run from your **laptop**. You will
**not** need Google Cloud Shell, and you'll never run a `gcloud` command.

Two free things you do need first:

- A **Google account**.
- A **GitHub account**.

Credit-card moments are called out in **bold**. There are two:
**Phase C** (GCP billing) and **Phase F** (OpenAI). Google won't charge you while
you stay in the free tier — new accounts get $300 of credit for 90 days.

---

## Phase A — Push the code to GitHub (your laptop, one time)

Run this once from the repo on your laptop. (You'll use the laptop terminal
again only once more, in Phase K.)

```bash
cd ~/GitHub/charity-net
gh auth login                                                    # follow prompts
gh repo create charity-net --private --source=. --remote=origin --push
```

No `gh` CLI? Create the repo manually at https://github.com/new (private, name
it `charity-net`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/charity-net.git   # ← replace YOUR_USERNAME
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

1. Bottom-left of the Firebase console: **Spark plan** → **Upgrade to Blaze**.
2. **Set up billing account** → enter card.
3. On the "Set a budget" step, set $20/month. You'll get email alerts at
   50/90/100% of budget.

---

## Phase D — Turn on the services (web, Firebase console)

1. **Firestore Database** → Create database → **Native mode** → pick a region
   (e.g. `europe-west1` or `us-central1`). **The region is permanent.** Pick
   close to your users.
2. **Storage** → Get started → **same region** as Firestore.
3. **Authentication** → Get started:
   - **Email/Password** → Enable → Save.
   - **Google** → Enable → set support email → Save.

---

## Phase E — Get the Firebase web config (web)

1. ⚙️ → Project settings → "Your apps" → click `</>` → register name
   `Charity Net Web` → **skip** the Hosting setup step → copy the six values:
   `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`,
   `appId`. You'll paste these in Phase K.

---

## Phase F — 💳 CREDIT CARD #2: OpenAI (web)

1. https://platform.openai.com → sign up.
2. Settings → Billing → Add payment method → top up $5 (or enable auto-recharge
   at $10).
3. API keys → **Create new secret key** → name `Charity Net` → **copy now,
   you cannot view it again**.

A gpt-4o vision scan of an item costs about $0.01.

---

## Phase G — Google Maps keys (web, uses your GCP card — no new card)

You'll make **two** API keys here: one for the browser (the website/map) and one
for the server (address lookups). Take them one at a time.

### G.1 — Select your project and turn on the two APIs

1. Go to https://console.cloud.google.com. In the **top blue bar**, click the
   project dropdown and select your `charity-net` project.
2. Left menu → **APIs & Services** → **Library**. Search for and **Enable**
   each of these (one click each, then click the browser back button to return
   to the Library):
   - **Maps JavaScript API**
   - **Geocoding API**

### G.2 — Create the **Browser** key

3. Left menu → **APIs & Services** → **Credentials** → **+ Create credentials**
   → **API key**. The "Create API key" panel opens.
4. **Name**: `Maps Browser Key`.
5. Under **"APIs that can be accessed using this key"** → open the
   **"Select API restrictions"** dropdown → in the Filter box type `maps` →
   tick **Maps JavaScript API** → **OK**.
6. Under **Application restrictions**, choose **Websites**.

   > ⚠️ This is the part that trips people up. Google **renamed "HTTP referrers"
   > to "Websites"** in this newer screen. **Websites = HTTP referrers** — they
   > are the same thing. Do **not** pick "IP addresses" for the browser key.

7. A **"Website restrictions"** section appears below. Click **+ Add**, paste
   this in the box, and confirm:
   ```
   http://localhost:5173/*
   ```
   (You'll add your real live URL here in **Phase N**, once it exists. Leaving
   only localhost for now is fine.)
8. Click **Create**. Copy the key string that pops up — this is your
   **Maps Browser key**. Save it somewhere; you'll paste it in Phase K.

### G.3 — Create the **Server** key

9. **Credentials** → **+ Create credentials** → **API key** again.
10. **Name**: `Maps Server Key`.
11. **Select API restrictions** dropdown → Filter `geocoding` → tick
    **Geocoding API** → **OK**.
12. **Application restrictions**: leave on **None** for now.
13. Click **Create** and copy this key too — this is your **Maps Server key**
    (used in Phase I).

Maps gives you $200/month free — for a project this size you'll almost certainly
never pay.

---

## Phase H — Notifications (nothing to set up)

There's no email to configure. All notifications ("a charity expressed
interest", "your charity was approved", etc.) appear **in-app** under the
"Alerts" bell — a real-time feed backed by Firestore. No SendGrid, no Gmail,
no extra accounts. Skip straight to Phase I.

---

## Phase I — Store your secret keys (web, Secret Manager)

Your server needs three secret values when it runs. You put them in Google's
vault — **Secret Manager** — so they never live in your code or on GitHub.

1. https://console.cloud.google.com → confirm your `charity-net` project is
   selected in the top bar → in the search bar type **Secret Manager** → open
   it. If prompted, click **Enable** (this turns on the Secret Manager API).
2. Click **+ Create secret** and make these **three** secrets, one at a time.
   For each: type the **Name** exactly as shown, paste the value into **Secret
   value**, leave everything else default, then **Create secret**.

   | Secret name (exact) | Value to paste |
   |---|---|
   | `openai-key` | your OpenAI key from **Phase F** |
   | `gmaps-server-key` | your Maps **server** key from **Phase G** |
   | `cron-job-secret` | any long random string **you make up** — at least 32 characters (mash the keyboard, or use a password generator). **Write it down**; you'll paste this exact value again in Phase M. |

You don't grant any permissions here — you'll connect these secrets to the
server in the next phase, and the console grants access for you.

---

## Phase J — Deploy the server to Cloud Run, auto-built from GitHub (web)

This is the automatic pipeline: connect your GitHub repo **once**, and Google
rebuilds and redeploys the server on **every** push to `main`. The console sets
up the build, the container storage, and all the permissions for you — no
command line.

### J.1 — Start the service and connect GitHub

1. https://console.cloud.google.com → search **Cloud Run** → open it →
   **Deploy container** → **Service**.
2. Choose **Continuously deploy from a repository (source or function)** →
   **Set up with Cloud Build**.
3. **Repository provider**: **GitHub** → authenticate → pick your `charity-net`
   repository → **Next**.
4. **Branch**: `^master$` (this repo's default branch is `master`, not `main`).
5. **Build type**: **Dockerfile**. Set the **Dockerfile path** to `/Dockerfile`
   (it lives at the repo **root** — this monorepo build needs the root as its
   context so it can see `pnpm-workspace.yaml` and `shared/`). → **Save**.

### J.2 — Configure the service

6. **Service name**: `charity-net-api` — it must be **exactly** this. (The
   website sends `/api` requests to a Cloud Run service with this name.)
7. **Region**: `europe-west1` (or your choice — if you pick another, you'll
   change one line in `firebase.json` in Phase K).
8. **Authentication**: select **Allow unauthenticated invocations**. (The
   website calls the API through a rewrite; this lets it through.)
9. Expand **Containers, Volumes, Networking, Security** → open the
   **Variables & Secrets** tab.
   - Under **Environment variables**, click **+ Add variable** for each row
     (replace `YOUR_PROJECT` with your project ID):

     | Name | Value |
     |---|---|
     | `FIREBASE_PROJECT_ID` | `YOUR_PROJECT` |
     | `FIREBASE_STORAGE_BUCKET` | `YOUR_PROJECT.appspot.com` |
     | `ALLOWED_ORIGINS` | `https://YOUR_PROJECT.web.app` |

   - Under **Secrets exposed as environment variables**, click
     **+ Reference a secret** for each row:

     | Exposed as (env var) | Secret | Version |
     |---|---|---|
     | `OPENAI_API_KEY` | `openai-key` | `latest` |
     | `GOOGLE_MAPS_SERVER_KEY` | `gmaps-server-key` | `latest` |
     | `JOB_SECRET` | `cron-job-secret` | `latest` |

     If a popup says the service's account needs permission to read a secret,
     click **Grant** — that's the access step, done for you.
10. *(Optional, avoids slow first request)* On the **Settings** tab, set
    **Minimum number of instances** to `1`.
11. Click **Create**.

The first build takes ~5 minutes. Watch it under **Cloud Run → your service →
Revisions**, or **Cloud Build → History**. When it succeeds, the API is live at
a `*.run.app` URL — but you don't use that directly; the website rewrites
`/api/**` to it in Phase K.

**From now on, every `git push` to `main` rebuilds and redeploys the server
automatically.** That's the whole CI/CD pipeline — nothing else to wire up.

> The `cloudbuild.yaml` file in the repo is **not** used by this console flow.
> It only exists for the optional manual fallback at the very bottom of this
> doc. You can ignore it.

---

## Phase K — Deploy the website + database rules + functions (command line)

This is the **one and only** command-line step. Everything that isn't a running
server — the website itself, the database security rules, the storage rules, and
the single background function — ships through the **Firebase CLI**. Run it from
your **laptop**, where you already have the repo (from Phase A).

1. Create the file `client/.env.production` in the repo. Fill in your Firebase
   values from **Phase E**, your **browser** Maps key from **Phase G**, and your
   project ID in place of `YOUR_PROJECT`:

   ```
   VITE_FIREBASE_API_KEY=<apiKey from Phase E>
   VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT
   VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId from Phase E>
   VITE_FIREBASE_APP_ID=<appId from Phase E>
   VITE_GOOGLE_MAPS_KEY=<Maps Browser key from Phase G>
   VITE_API_BASE_URL=/api
   VITE_USE_EMULATORS=false
   ```

2. Open `.firebaserc` and replace `charity-net-prod` with **your** project ID,
   so it looks like:

   ```json
   {
     "projects": {
       "default": "charity-net-dev",
       "production": "YOUR_PROJECT"
     }
   }
   ```

3. If your Cloud Run **region** in Phase J was **not** `europe-west1`, open
   `firebase.json` and change the `region` under `hosting` → `rewrites` to match.

4. In a terminal in the repo, install tools, log in, and deploy:

   ```bash
   corepack enable                 # turns on pnpm (one-time)
   pnpm install
   npx firebase login              # opens a browser to sign in to Firebase
   npx firebase use production     # selects YOUR_PROJECT
   pnpm deploy                     # builds the site, deploys hosting + rules + functions
   ```

When it finishes it prints:

> `Hosting URL: https://YOUR_PROJECT.web.app`

That's your live app.

---

## Phase L — Make yourself admin (command line, one command)

The app stores "who is an admin" as a secure token claim, which there's no
console button for — so this one command sets it. Run it from the **same laptop
terminal** as Phase K.

1. Open `https://YOUR_PROJECT.web.app` in another tab → **sign up** with your
   real email and a password. This creates your user account.
2. In the repo terminal, run (replace the email):

   ```bash
   FIREBASE_PROJECT_ID=YOUR_PROJECT \
     pnpm --filter @charity-net/scripts set-admin you@your-email.com
   ```

   This needs Google **application-default credentials**. If you have the
   `gcloud` CLI, run `gcloud auth application-default login` once first. If you
   don't and don't want to install it, run this single command in **Cloud Shell**
   instead (open it with the `>_` icon in the Cloud console — it has credentials
   built in; clone the repo there with `gh repo clone YOUR_USERNAME/charity-net`,
   `cd charity-net`, `corepack enable && pnpm install`, then run the command above).

3. Back in the app tab: **sign out, then sign back in**. You'll now see
   `/admin/approvals` in the nav.

---

## Phase M — Schedule the interest-window expiry job (web, Cloud Scheduler)

A small job runs every 30 minutes to close expired 24-hour interest windows.

1. https://console.cloud.google.com → search **Cloud Scheduler** → open it →
   **Create job**. If prompted, **Enable** the Scheduler API (and, if asked to
   create an App Engine app for the region, accept — both are one-time and free).
2. Fill in:
   - **Name**: `expire-interest-windows`
   - **Region**: `europe-west1` (or your region)
   - **Frequency**: `*/30 * * * *`  (every 30 minutes)
   - **Timezone**: your choice
   - **Target type**: **HTTP**
   - **URL**: `https://YOUR_PROJECT.web.app/api/jobs/expire-interest-windows`
   - **HTTP method**: **POST**
   - Expand **Show more** → **Add a header**:
     - Name: `x-job-secret`
     - Value: the **same `cron-job-secret` value you created in Phase I**
3. **Create**. To test it now, click **Run now** on the job and check it reports
   success.

---

## Phase N — Lock down the Maps browser key (web)

Back in Phase G you only allowed `localhost`. Now your live URL exists, so add it.

1. https://console.cloud.google.com → **APIs & Services** → **Credentials** →
   click the name **Maps Browser Key**.
2. Scroll to **Application restrictions** → it's already set to **Websites**
   (the renamed "HTTP referrers"). Under **Website restrictions** click
   **+ Add** and paste your live URL, then confirm:
   ```
   https://YOUR_PROJECT.web.app/*
   ```
   Replace `YOUR_PROJECT` with your real project ID (the `web.app` URL printed
   at the end of Phase K).
3. Click **Save** at the bottom. Both `localhost` and the live URL are now
   allowed.

---

## Phase O — Smoke test (web)

1. Open `https://YOUR_PROJECT.web.app`:
   - Sign up a second account as a **Person** → post an item with a real photo
     → tags should appear within ~10 seconds (the AI scan).
   - Sign up a third account as a **Charity** → switch to your admin →
     `/admin/approvals` → approve.
   - Sign back in as the charity → map shows the item → **Express Interest** →
     open chat → send a message.

If something looks off, check the logs in the console:

- **Server**: Cloud Run → `charity-net-api` → **Logs**.
- **Function**: Firebase console → **Functions** → **Logs**.

---

## Future deploys

### Server (automatic)

`git push origin main` from your laptop. The GitHub integration you set up in
Phase J automatically rebuilds the server image and rolls out a new Cloud Run
revision. Watch it under **Cloud Run → charity-net-api → Revisions** or
**Cloud Build → History**. Nothing to run by hand.

### Website + rules + functions (from your laptop)

```bash
pnpm deploy        # builds the site and deploys hosting + rules + functions
```

This runs:

```bash
pnpm --filter @charity-net/shared build
pnpm --filter @charity-net/client build
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage,functions
```

You log in once with `npx firebase login`; after that this is all you run for
website changes.

### Emergency manual server deploy (advanced, optional)

If you ever need to push a server fix without going through GitHub, and you have
the `gcloud` CLI logged into the project, you can build straight from your
working tree:

```bash
pnpm run deploy:server:manual   # gcloud builds submit --config cloudbuild.yaml .
```

This is the only thing that uses `cloudbuild.yaml`. The normal pipeline in
Phase J does not.
