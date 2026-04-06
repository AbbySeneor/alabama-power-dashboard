# ROW Intelligence

Sales demo dashboard: vegetation risk intelligence for Alabama Power transmission rights-of-way, powered by Treelyon.

## Setup

```bash
npm install
```

Get a free Mapbox token at [mapbox.com/signup](https://account.mapbox.com/auth/signup/) and add it to `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.…
```

Use the **public** token (`pk.…`), not the secret token (`sk.…`).

### Google Earth Engine (server-side)

Charts and raster map layers are computed in Next.js API routes via the official `@google/earthengine` client. Configure **one** of these:

**A — Key file (recommended)**  
1. Download the service account JSON from Google Cloud (IAM → service account → Keys).  
2. Run `npm run gee:install-key -- /path/to/key.json` — copies it to `secrets/gee-service-account.json` (gitignored).  
3. Set `GOOGLE_APPLICATION_CREDENTIALS=secrets/gee-service-account.json` and `EARTH_ENGINE_PROJECT=your-project-id` in `.env.local`.

**B — Inline JSON**  
`GOOGLE_APPLICATION_CREDENTIALS_JSON` = full service account JSON, one line.

**C — Treelyon-style `GEE_PRIVATE_KEY`**  
Full JSON string if it starts with `{`, else PEM plus `GEE_SERVICE_ACCOUNT_EMAIL` (must be the key’s **`client_email`** `*.iam.gserviceaccount.com`, not a personal Gmail). On **DigitalOcean App Platform**, prefer **`GEE_PRIVATE_KEY`** (one-line JSON) as in `docs/DEPLOY_DIGITALOCEAN.md`; it is read before `GOOGLE_APPLICATION_CREDENTIALS_JSON`.

Register that service account for Earth Engine in the [Earth Engine access](https://developers.google.com/earth-engine/guides/access) flow. Without valid credentials, `/api/ee/dashboard` and `/api/ee/tiles` return 503 and the UI shows fallbacks.

## Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

Production Docker images use **standalone** output (`Dockerfile` at repo root). See **[docs/DEPLOY_DIGITALOCEAN.md](docs/DEPLOY_DIGITALOCEAN.md)** for **DigitalOcean App Platform** (or a Droplet).

## Data notes

- **Transmission lines** are loaded from the public [HIFLD](https://hifld-geoplatform.opendata.arcgis.com/) ArcGIS service: all features intersecting an Alabama bounding box are fetched with **paged queries** (2000 records per request). If the service is unavailable, the app falls back to representative GeoJSON segments.
- **NDVI, canopy, storm loss, and encroachment** map layers are **Google Earth Engine** map tiles (`/api/ee/tiles`). Sidebar charts use **MODIS**, **GEDI**, **GRIDMET**, and **Sentinel-2** via `/api/ee/dashboard`.
