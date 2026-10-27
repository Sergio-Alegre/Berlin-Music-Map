// Geocodes data/jobs.json (entities and sites[]) with Nominatim (1 request/s, cache in data/geo/geocode-cache.json).
// Usage: NOMINATIM_CONTACT=you@example.org node scripts/geocode.js [--limit N]
// Order: full address -> street without number -> postcode centroid (precision "postcode").
// Nominatim's usage policy requires an identifying User-Agent with a contact: set NOMINATIM_CONTACT
// to your email address or project URL.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const JOBS = path.join(ROOT, "data", "jobs.json");
const CACHE = path.join(ROOT, "data", "geo", "geocode-cache.json");
const CONTACT = process.env.NOMINATIM_CONTACT;
if (!CONTACT) {
  console.error(
    "Error: the environment variable NOMINATIM_CONTACT is not set.\n" +
      "Nominatim's usage policy requires requests to identify the application and a way to contact you.\n" +
      "Set it to your email address or project URL, then run again, for example:\n" +
      "  PowerShell:  $env:NOMINATIM_CONTACT = \"you@example.org\"; node scripts/geocode.js\n" +
      "  bash:        NOMINATIM_CONTACT=you@example.org node scripts/geocode.js"
  );
  process.exit(1);
}
const UA = `berlin-music-map/1.0 (${CONTACT})`;
const BBOX = { minLat: 52.33, maxLat: 52.68, minLng: 13.08, maxLng: 13.77 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
let last = 0;

async function query(params) {
  const key = JSON.stringify(params);
  if (key in cache) return cache[key];
  const wait = Math.max(0, 1100 - (Date.now() - last));
  await sleep(wait);
  last = Date.now();
  const url = "https://nominatim.openstreetmap.org/search?" + new URLSearchParams({ ...params, format: "jsonv2", limit: "1", countrycodes: "de", addressdetails: "1" });
  let res = null;
  for (let attempt = 0; attempt < 3 && !res; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "de" }, signal: AbortSignal.timeout(20000) });
      if (r.status === 429 || r.status >= 500) { await sleep(5000 * (attempt + 1)); continue; }
      res = await r.json();
    } catch (e) { await sleep(3000); }
  }
  if (res === null) return undefined; // network failure: not cached
  const hit = res[0] ? { lat: +res[0].lat, lng: +res[0].lon, type: res[0].type, cls: res[0].category, house: res[0].address && res[0].address.house_number } : null;
  cache[key] = hit;
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  return hit;
}

const inBerlin = (h) => h && h.lat >= BBOX.minLat && h.lat <= BBOX.maxLat && h.lng >= BBOX.minLng && h.lng <= BBOX.maxLng;

async function geocode(e) {
  const a = e.address;
  const full = await query({ street: a.street, postalcode: a.postcode, city: "Berlin" });
  if (inBerlin(full)) return { lat: full.lat, lng: full.lng, precision: full.house ? "address" : "street", source: "nominatim" };
  const street = a.street.replace(/\s*\d+\s*[a-zA-Z]?(\s*[-–/]\s*\d+\s*[a-zA-Z]?)?\s*$/, "");
  if (street && street !== a.street) {
    const s = await query({ street: street, postalcode: a.postcode, city: "Berlin" });
    if (inBerlin(s)) return { lat: s.lat, lng: s.lng, precision: "street", source: "nominatim" };
  }
  const pc = await query({ postalcode: a.postcode, city: "Berlin" });
  if (inBerlin(pc)) return { lat: pc.lat, lng: pc.lng, precision: "postcode", source: "nominatim" };
  return null;
}

(async () => {
  const jobs = JSON.parse(fs.readFileSync(JOBS, "utf8"));
  const limit = process.argv.includes("--limit") ? +process.argv[process.argv.indexOf("--limit") + 1] : Infinity;
  let n = 0, fail = [];
  for (const e of jobs) {
    if (e.geo && e.geo.lat) continue;
    if (n++ >= limit) break;
    const g = await geocode(e);
    if (g) e.geo = g; else fail.push(e.id);
    process.stdout.write(`${e.id} -> ${g ? g.precision : "FAILED"}\n`);
  }
  // secondary sites with street and postcode
  const failSites = [];
  for (const e of jobs) {
    for (const s of e.sites || []) {
      if (!s.street || !s.postcode || (s.geo && s.geo.lat)) continue;
      const g = await geocode({ address: { street: s.street, postcode: s.postcode } });
      if (g) s.geo = g; else failSites.push(e.id + ": " + s.name);
      process.stdout.write(`  site ${e.id} / ${s.name} -> ${g ? g.precision : "FAILED"}\n`);
    }
  }
  if (failSites.length) console.log("Sites without geo:", failSites.join("; "));
  fs.writeFileSync(JOBS, JSON.stringify(jobs, null, 2) + "\n");
  const by = {};
  jobs.forEach((e) => { const p = e.geo ? e.geo.precision : "no geo"; by[p] = (by[p] || 0) + 1; });
  console.log("Summary:", by, fail.length ? "Failures: " + fail.join(", ") : "");
})();
