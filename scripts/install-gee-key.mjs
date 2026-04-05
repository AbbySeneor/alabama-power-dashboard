#!/usr/bin/env node
/**
 * Copies a downloaded GCP service account JSON into secrets/gee-service-account.json
 * Usage: npm run gee:install-key -- ~/Downloads/your-project-abc123.json
 */
import { copyFileSync, mkdirSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dest = resolve(root, "secrets", "gee-service-account.json");

const src = process.argv[2];
if (!src) {
  console.error(
    "Usage: npm run gee:install-key -- /path/to/service-account-key.json",
  );
  process.exit(1);
}

const absSrc = resolve(process.cwd(), src);
let raw;
try {
  raw = readFileSync(absSrc, "utf8");
} catch (e) {
  console.error("Cannot read:", absSrc, e);
  process.exit(1);
}

const o = JSON.parse(raw);
if (!o.client_email || !o.private_key) {
  console.error("File must be a service account JSON with client_email and private_key.");
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(absSrc, dest);
console.log("Installed Earth Engine credentials to secrets/gee-service-account.json");
console.log("Service account:", o.client_email);
console.log("Restart npm run dev if it is already running.");
