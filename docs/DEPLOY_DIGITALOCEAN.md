# Deploy to DigitalOcean

This app is a **Next.js 14** service with a **Dockerfile** (standalone output). The usual path is **App Platform** (builds from GitHub). Earth Engine and Mapbox need **environment variables**.

## Prerequisites

- GitHub repo pushed (e.g. `AbbySeneor/alabama-power-dashboard`).
- A **Mapbox** public token (`NEXT_PUBLIC_MAPBOX_TOKEN`).
- A **Google Earth Engine** service account JSON for server-side `/api/ee/*` routes.

## Option A — App Platform (recommended)

1. Log in to [DigitalOcean](https://cloud.digitalocean.com/) → **Apps** → **Create App**.
2. Choose **GitHub**, authorize, select **`alabama-power-dashboard`** and branch **`main`**.
3. DigitalOcean should detect the **Dockerfile**. Confirm:
   - **HTTP port:** `3000`
   - **Resource size:** e.g. **Basic** (512 MB) or larger if builds fail OOM.
4. Under **Environment variables** (app or component), add:

   | Variable | Scope | Notes |
   |----------|--------|--------|
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | **Build + Run** | Required; inlined at build. |
   | `GOOGLE_APPLICATION_CREDENTIALS_JSON` | **Run only** | Full service account JSON as **one line** (same as local `.env.example` option B). |
   | `EARTH_ENGINE_PROJECT` | **Run only** | Optional if `project_id` is inside the JSON. |

   Mark sensitive values as **Encrypt** / **Secret**.

5. **Create resources** and wait for the first deploy.

6. Optional: **Settings → Domains** to attach a custom domain and enable HTTPS.

### Deploy on push

With the GitHub integration, each push to `main` triggers a new deployment.

### Optional: app spec

You can paste `.do/app.yaml` via **Create App → From spec**, then add the variables in the UI (the spec does not store secrets).

## Option B — Droplet (Docker)

On a Ubuntu droplet:

```bash
git clone https://github.com/AbbySeneor/alabama-power-dashboard.git
cd alabama-power-dashboard
# Create .env with NEXT_PUBLIC_MAPBOX_TOKEN and GOOGLE_APPLICATION_CREDENTIALS_JSON
docker build -t row-dash --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey... .
docker run -d -p 3000:3000 \
  -e GOOGLE_APPLICATION_CREDENTIALS_JSON='...' \
  -e EARTH_ENGINE_PROJECT=your-gee-project \
  row-dash
```

Put **Caddy** or **nginx** in front for TLS on port 443.

## Troubleshooting

- **Map is blank:** `NEXT_PUBLIC_MAPBOX_TOKEN` missing or wrong at **build** time; rebuild after fixing.
- **Earth Engine errors:** Check `GOOGLE_APPLICATION_CREDENTIALS_JSON` (valid JSON, EE API enabled for the project, service account registered in Earth Engine).
- **Build OOM:** Increase App Platform plan or build machine size.
