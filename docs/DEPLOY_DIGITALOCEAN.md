# Deploy on DigitalOcean App Platform

This app ships a **Dockerfile** (Next.js **standalone**). App Platform builds the image from GitHub and runs `node server.js` on port **3000**.

**Repo:** `AbbySeneor/alabama-power-dashboard` · branch **`main`**

---

## 1. Create the app

1. Open [DigitalOcean → Apps → Create app](https://cloud.digitalocean.com/apps/new).
2. **GitHub** → authorize if needed → pick **`alabama-power-dashboard`** → branch **`main`**.
3. DigitalOcean should detect **Dockerfile** at the repo root.
4. Edit the **Web Service** component if needed:
   - **HTTP request routes:** `/` → this service  
   - **HTTP port:** `3000`  
   - **Instance size:** start with **Basic** (e.g. 512 MB); bump if the Docker **build** runs out of memory.

---

## 2. Environment variables (required)

Open the component (or app) **Environment Variables** section **before** the first deploy.

| Key | When it applies | Value |
|-----|-----------------|--------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | **Build** *and* **Run** | Your Mapbox **public** token (`pk.…`). Must be present at **build** so Next.js can inline it. |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | **Run** only | Full Google **service account JSON** as a **single line** (no line breaks). Same as local `.env.example` option B. |
| `EARTH_ENGINE_PROJECT` | **Run** only | Optional if the JSON already contains `project_id`. |

**Secrets:** turn on **Encrypt** (or mark as secret) for the token and JSON.

In the App Platform UI, each variable usually has checkboxes like **Available at build time** and **Available at run time**:

- `NEXT_PUBLIC_MAPBOX_TOKEN` → enable **both** build and run.  
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` and `EARTH_ENGINE_PROJECT` → **run time only**.

---

## 3. Deploy

Click **Create resources** / **Deploy**. The first build can take several minutes.

When it finishes, open the **`*.ondigitalocean.app`** URL.

---

## 4. After deploy

- **Custom domain:** App → **Settings** → **Domains** → add domain; App Platform provisions HTTPS.
- **Auto-deploy:** With GitHub connected, pushes to **`main`** trigger new deployments (see app settings if you want to limit branches).

### Optional: create from YAML

1. **Create app** → **From a spec** (or upload spec).  
2. Paste `.do/app.yaml` from this repo.  
3. Still add the **environment variables** in the UI (the spec does not store secrets).

---

## Quick check: Earth Engine

After deploy, open **`https://<your-app>.ondigitalocean.app/api/ee/health`** in the browser.

- **`earthEngine: "ready"`** — auth and `ee.initialize` succeeded; if charts still fail, check **runtime logs** for compute errors.
- **`no_credentials`** — add `GOOGLE_APPLICATION_CREDENTIALS_JSON` (or another supported variable) in App Platform.
- **`init_failed`** — read the `message` (wrong JSON, SA not registered for EE, missing project, etc.).

### Debug: local works, production 504

| Check | What it tells you |
|-------|-------------------|
| **`/api/ee/health`** | Credentials + `ee.initialize` only (usually fast). |
| **`/api/ee/diagnose`** | Same init plus one tiny `getInfo` and **`timingsMs`**. If this returns **200 in a few seconds** but **`/api/ee/dashboard`** returns **504**, the gateway is killing the long dashboard/tiles request — not auth. |
| **Runtime logs** | Search for **`[ee/dashboard]`** and **`[ee/tiles]`**: `getEarthEngine ms`, `computeEarthEngineDashboard ms`, `buildMapTiles ms`. If you never see the final line, the process was cut off by the platform timeout. |

**Why `next dev` differs:** Local development has **no** App Platform (~60s) gateway in front of your API routes, so slow Earth Engine work can still finish. Production cannot.

**Mitigations:** Keep production **`eeFastMode`** (default: do **not** set `EE_FULL_COMPUTE=1`), deploy the latest app (MODIS-based NDVI tiles in fast mode), or **resize** the web component to a larger instance.

## Troubleshooting (App Platform)

| Issue | What to check |
|-------|----------------|
| Map shows “Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local” | The token was not in the **Docker build**. In App Platform, open the variable → enable **Available at build time** (and run time) → **Actions → Deploy** to rebuild the image. |
| Map is gray / blank | Same as above, or wrong token value; fix and **redeploy** so a new build runs. |
| `/api/ee/*` 503 | `GOOGLE_APPLICATION_CREDENTIALS_JSON` valid JSON, EE enabled on the GCP project, service account [registered for Earth Engine](https://developers.google.com/earth-engine/guides/access). |
| `Unexpected token '<', "<!DOCTYPE"...` or “HTML instead of JSON” | Often an **HTTP 504 gateway timeout** (body is HTML): Earth Engine or the app exceeded the platform’s request budget (~60–100s). **Production defaults to a fast EE profile** (`NODE_ENV=production`): lighter MODIS range, no Sentinel-2 storm loss metric, **placeholder storm map tile**, fewer precip windows, coarser risk stats. Redeploy the latest app. For full storm tiles + 2013–2024 NDVI + storm km², set **`EE_FULL_COMPUTE=1`** and use a **larger instance** (`basic-xs` or up). Do not set **`EE_FULL_COMPUTE`** unless you need that fidelity. Also verify **`GOOGLE_APPLICATION_CREDENTIALS_JSON`** is raw JSON starting with `{`, one line. |
| Build fails or OOM | Larger **build** machine or app **plan**; inspect **Runtime logs** / build logs in the app’s **Activity** tab. |
| Health check fails | App listens on **`PORT`** (we set `3000` in the Dockerfile); route `/` should return 200 for the static shell. |

---

## Alternative: Droplet + Docker

If you prefer a VM instead of App Platform, use the same `Dockerfile` and `docker run` with `-e` for the variables above. See older revisions of this file or ask your team for a Droplet runbook.
