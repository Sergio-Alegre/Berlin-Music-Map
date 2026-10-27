// Adds nearest_station {name, distance_m} (U-Bahn or S-Bahn) to every entity in data/jobs.json.
// distance_m = straight-line distance x 1.25 (walking approximation). Usage: node scripts/enrich_stations.js
const fs = require("fs");
const path = require("path");
const stations = Object.values(require(path.join(__dirname, "node_modules", "vbb-stations"))())
  .filter((s) => s.id.startsWith("de:11000") && /^(S\+U|S|U) /.test(s.name) && !/[\/\[]/.test(s.name) && s.location);
const JOBS = path.join(__dirname, "..", "data", "jobs.json");

const rad = (d) => (d * Math.PI) / 180;
function dist(a, b, c, d) {
  const x = rad(d - b) * Math.cos(rad((a + c) / 2));
  const y = rad(c - a);
  return 6371000 * Math.hypot(x, y);
}

const jobs = JSON.parse(fs.readFileSync(JOBS, "utf8"));
let far = 0;
for (const e of jobs) {
  if (!e.geo) continue;
  let best = null;
  for (const s of stations) {
    const d = dist(e.geo.lat, e.geo.lng, s.location.latitude, s.location.longitude);
    if (!best || d < best.d) best = { d, name: s.name };
  }
  e.nearest_station = { name: best.name, distance_m: Math.round(best.d * 1.25) };
  if (best.d * 1.25 > 1500) far++;
}
fs.writeFileSync(JOBS, JSON.stringify(jobs, null, 2) + "\n");
console.log(`${jobs.length} entities enriched; ${far} more than 1500 m from a station`);
