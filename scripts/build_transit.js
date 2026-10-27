#!/usr/bin/env node
// Genera data/geo/transit.geojson (U-Bahn, S-Bahn, tram, bus and U/S stations) from
// the npm packages vbb-lines (lines and stops), vbb-stations (coordinates) and vbb-shapes (geometry).
//
// vbb-lines does not link each variant to a shape. The link is made geometrically: a shape fits a
// variant if it starts and ends next to its first and last stop and passes next to almost all the others.
// What is missing from the package is filled in by joining stations in order:
//   - U4 is not in vbb-lines: joined as Nollendorfplatz - Viktoria-Luise-Platz - Bayerischer Platz - Rathaus Schöneberg - Innsbrucker Platz.
//   - U6 north (Alt-Tegel - Kurt-Schumacher-Platz) only appears as a replacement bus line "U6": it is drawn
//     dashed (property closed) and its stations carry `closed`.
// Variants with fewer than 3 trips (2 for buses) are ignored: they are one-day diversions. Stations with the same
// name within 450 m (U2 and U6 platforms at Stadtmitte) are merged. S45 and S35 do not exist in the package.
// Bus and tram are clipped to the Berlin polygon (data/geo/bezirke.geojson); S-Bahn keeps its surroundings.
// U and S colours: BVG and S-Bahn Berlin colour scheme (from memory, no official source at hand).
//
// Uso: node scripts/build_transit.js [--bus-tol 10] [--bus-min-trips 2]
const fs = require("fs");
const path = require("path");

const NM = path.join(__dirname, "node_modules");
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "geo", "transit.geojson");

const args = process.argv.slice(2);
const argVal = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const TOL = { U: 10, S: 10, tram: 10, bus: argVal("--bus-tol", 10) };
const BUS_MIN_TRIPS = argVal("--bus-min-trips", 2);

// ---------- colours ----------
// U-Bahn and S-Bahn: line colours of BVG / S-Bahn Berlin. Tram and bus: one colour per mode.
const COLORS = {
  U1: "#55A822", U2: "#DA421E", U3: "#16683D", U4: "#F0D722", U5: "#7E5330",
  U6: "#8C6DAB", U7: "#528DBA", U8: "#224F86", U9: "#F3791D",
  S1: "#DA6BA2", S2: "#007734", S25: "#007734", S26: "#007734", S3: "#0066AD",
  S4: "#B1431F", S41: "#A23B1E", S42: "#C26A1D", S45: "#CD9C53", S46: "#CD9C53", S47: "#CD9C53",
  S5: "#FF5900", S7: "#6F4E9C", S75: "#6F4E9C", S8: "#55A822", S85: "#55A822", S9: "#94245D",
};
const TRAM_COLOR = "#C8102E";
const BUS_COLOR = "#8E3B9E";

// ---------- geometry ----------
const LAT0 = 52.5;
const KX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const KY = 111320;
const dist = (a, b) => Math.hypot((a[1] - b[1]) * KX, (a[0] - b[0]) * KY); // points [lat,lng]

function distPointSeg(p, a, b) {
  const px = p[1] * KX, py = p[0] * KY, ax = a[1] * KX, ay = a[0] * KY, bx = b[1] * KX, by = b[0] * KY;
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function distToPolyline(p, pl) {
  let best = Infinity;
  for (let i = 0; i < pl.length - 1; i++) {
    const d = distPointSeg(p, pl[i], pl[i + 1]);
    if (d < best) best = d;
  }
  return best;
}
function polyLength(pl) {
  let s = 0;
  for (let i = 1; i < pl.length; i++) s += dist(pl[i - 1], pl[i]);
  return s;
}
// Ramer-Douglas-Peucker iterative, tolerance in metres.
function rdp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let md = 0, mi = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distPointSeg(pts[i], pts[s], pts[e]);
      if (d > md) { md = d; mi = i; }
    }
    if (md > tol && mi > 0) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function densify(pl, step) {
  const out = [pl[0]];
  for (let i = 1; i < pl.length; i++) {
    const d = dist(pl[i - 1], pl[i]);
    const n = Math.floor(d / step);
    for (let k = 1; k <= n; k++) {
      const t = k / (n + 1);
      out.push([pl[i - 1][0] + (pl[i][0] - pl[i - 1][0]) * t, pl[i - 1][1] + (pl[i][1] - pl[i - 1][1]) * t]);
    }
    out.push(pl[i]);
  }
  return out;
}

// ---------- Berlin polygon (even-odd rule over all rings of the 12 districts) ----------
const bez = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "geo", "bezirke.geojson"), "utf8"));
const BUCKET = 0.002;
const edgeBuckets = new Map();
let bMinLat = 90, bMaxLat = -90, bMinLng = 180, bMaxLng = -180;
function addRing(ring) {
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
    bMinLat = Math.min(bMinLat, y1); bMaxLat = Math.max(bMaxLat, y1);
    bMinLng = Math.min(bMinLng, x1); bMaxLng = Math.max(bMaxLng, x1);
    if (y1 === y2) continue;
    const lo = Math.floor(Math.min(y1, y2) / BUCKET), hi = Math.floor(Math.max(y1, y2) / BUCKET);
    for (let b = lo; b <= hi; b++) {
      if (!edgeBuckets.has(b)) edgeBuckets.set(b, []);
      edgeBuckets.get(b).push([x1, y1, x2, y2]);
    }
  }
}
for (const f of bez.features) {
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) for (const ring of poly) addRing(ring);
}
function inBerlin(lat, lng) {
  if (lat < bMinLat || lat > bMaxLat || lng < bMinLng || lng > bMaxLng) return false;
  const edges = edgeBuckets.get(Math.floor(lat / BUCKET));
  if (!edges) return false;
  let c = 0;
  for (const [x1, y1, x2, y2] of edges) {
    if ((y1 > lat) !== (y2 > lat) && lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) c++;
  }
  return c % 2 === 1;
}
// S-Bahn: a wide area around Berlin is kept (Potsdam, Oranienburg...).
const inWideArea = (lat, lng) => lat > 52.28 && lat < 52.78 && lng > 12.95 && lng < 13.85;

// ---------- VBB data ----------
const lines = require(path.join(NM, "vbb-lines", "data.json"));
// "de:11000:900110001:1:50" y "de:11000:900110001::2" -> "de:11000:900110001"
const parentId = (id) => (/^de:\d+:\d+/.test(String(id)) ? String(id).split(":").slice(0, 3).join(":") : String(id));
// vbb-stations: short list with one entry per stop (id, short name, coordinates)
const stopLocMap = new Map();
const parentAcc = new Map();
const parentName = new Map();
for (const s of require(path.join(NM, "vbb-stations"))()) {
  if (!s.location) continue;
  const loc = [s.location.latitude, s.location.longitude];
  stopLocMap.set(s.id, loc);
  const pid = parentId(s.id);
  const acc = parentAcc.get(pid) || { lat: 0, lng: 0, n: 0 };
  acc.lat += loc[0]; acc.lng += loc[1]; acc.n++;
  parentAcc.set(pid, acc);
  if (!parentName.has(pid)) parentName.set(pid, s.name);
}
const parentLoc = new Map([...parentAcc].map(([k, v]) => [k, [v.lat / v.n, v.lng / v.n]]));
const stopLoc = (id) => stopLocMap.get(id) || parentLoc.get(parentId(id)) || null;

// All shapes (13.8k ids, fewer unique signatures)
console.log("Reading shapes...");
const ids = require(path.join(NM, "vbb-shapes", "ids.json"));
const uncompress = require(path.join(NM, "vbb-shapes", "uncompress.js"));
const sigs = [...new Set(Object.values(ids))];
const shapes = [];
const cellKey = (lat, lng) => Math.floor(lat / 0.005) + "," + Math.floor(lng / 0.0075);
const startIdx = new Map();
for (const sig of sigs) {
  let raw;
  try { raw = JSON.parse(fs.readFileSync(path.join(NM, "vbb-shapes", "data", sig + ".json"), "utf8")); } catch { continue; }
  if (!raw.length) continue;
  const pts = uncompress(raw);
  if (pts.length < 2) continue;
  // discard what is far from Berlin (quick check against the wide area)
  if (!pts.some((p) => inWideArea(p[0], p[1]))) continue;
  const sh = { sig, pts, a: pts[0], b: pts[pts.length - 1] };
  shapes.push(sh);
  const k = cellKey(sh.a[0], sh.a[1]);
  if (!startIdx.has(k)) startIdx.set(k, []);
  startIdx.get(k).push(sh);
}
console.log(`  ${sigs.length} signatures, ${shapes.length} near Berlin`);

function near(p, r) {
  const out = [];
  const la = Math.floor(p[0] / 0.005), lo = Math.floor(p[1] / 0.0075);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const arr = startIdx.get(la + i + "," + (lo + j));
    if (arr) for (const s of arr) if (dist(s.a, p) <= r) out.push(s);
  }
  return out;
}

// Best shape for a sequence of stops (list of [lat,lng]); null if none fits.
function matchShape(stops, endTol = 400, cover = 0.8, stopTol = 90) {
  if (stops.length < 2) return null;
  const first = stops[0], last = stops[stops.length - 1];
  const cands = new Map();
  for (const s of near(first, endTol)) if (dist(s.b, last) <= endTol) cands.set(s.sig, s);
  for (const s of near(last, endTol)) if (dist(s.b, first) <= endTol) cands.set(s.sig, s);
  let best = null;
  for (const s of cands.values()) {
    let ok = 0;
    for (const p of stops) if (distToPolyline(p, s.pts) <= stopTol) ok++;
    const frac = ok / stops.length;
    if (frac < cover) continue;
    // with equal coverage, prefer the shortest (fewer detours)
    if (!best || frac > best.frac + 0.001 || (Math.abs(frac - best.frac) <= 0.001 && s.pts.length < best.s.pts.length)) best = { s, frac };
  }
  return best ? best.s : null;
}

// ---------- building lines ----------
const MODE_OF = (l) => (l.product === "subway" ? "U" : l.product === "suburban" ? "S" : l.product === "tram" ? "tram" : l.product === "bus" ? "bus" : null);

// Synthetic line for what is missing from the package
const STATION_BY_NAME = (re) => {
  for (const [pid, name] of parentName) if (pid.startsWith("de:11000") && !pid.includes("::") && re.test(name)) return { id: pid, name };
  return null;
};
const synthetic = [];
if (!lines.some((l) => l.name === "U4")) {
  const order = [/^U Nollendorfplatz/, /^U Viktoria-Luise-Platz/, /^U Bayerischer Platz/, /^U Rathaus Schöneberg/, /^(S\+U|U) Innsbrucker Platz/];
  const sts = order.map(STATION_BY_NAME);
  if (sts.every(Boolean)) {
    synthetic.push({ name: "U4", product: "subway", variants: [{ stops: sts.map((s) => s.id), trips: 999 }], synthetic: true });
  }
}

const featuresByMode = { U: [], S: [], tram: [], bus: [] };
const stationAgg = new Map(); // parent id -> {name, locs[], lines:Set, modes:Set}
const report = { missingShapes: [], fallback: [], dropped: [], synthetic: synthetic.map((l) => l.name) };

// Group by name (the package repeats the same name with several ids)
const byName = new Map();
for (const l of [...lines, ...synthetic]) {
  const mode = MODE_OF(l);
  if (!mode) continue;
  if (mode === "bus" && !/^[MNX]?\d+[A-Za-z]?$/.test(l.name)) continue; // replacement services (U7, S47...), RB/RE, ferries
  const key = mode + "|" + l.name;
  if (!byName.has(key)) byName.set(key, { mode, name: l.name, variants: [] });
  for (const v of l.variants) byName.get(key).variants.push({ stops: v.stops || v, trips: v.trips || 1 });
}

function buildLine(entry) {
  const { mode, name } = entry;
  const clip = mode === "tram" || mode === "bus";
  // unique variants (by station sequence)
  const seen = new Set();
  const variants = [];
  for (const v of entry.variants) {
    if (v.trips < (mode === "bus" ? BUS_MIN_TRIPS : 3)) continue; // drop one-off trips (single-day diversions)
    const key = v.stops.map(parentId).join(">");
    if (seen.has(key)) continue;
    seen.add(key);
    variants.push(v);
  }
  // U/S stations
  if (mode === "U" || mode === "S") {
    for (const v of variants) for (const sid of v.stops) {
      const loc = stopLoc(sid);
      if (!loc || !inBerlin(loc[0], loc[1])) continue;
      const pid = parentId(sid);
      if (!stationAgg.has(pid)) stationAgg.set(pid, { name: parentName.get(pid) || pid, locs: [], lines: new Set(), modes: new Set() });
      const a = stationAgg.get(pid);
      a.locs.push(loc); a.lines.add(name); a.modes.add(mode);
    }
  }
  // shapes per variant
  const matched = new Map();
  const unmatchedVars = [];
  for (const v of variants) {
    const coords = v.stops.map(stopLoc).filter(Boolean);
    const sh = matchShape(coords);
    if (sh) matched.set(sh.sig, sh); else unmatchedVars.push(coords);
  }
  const pieces = [...matched.values()].map((s) => s.pts);
  // Variants without a shape: ignored if their route is already covered by another shape of the line;
  // otherwise their stations are joined in order (last resort).
  let usedFallback = 0;
  for (const coords of unmatchedVars) {
    if (coords.length < 2) continue;
    const ok = coords.filter((p) => pieces.some((pl) => distToPolyline(p, pl) <= 80)).length;
    if (pieces.length && ok / coords.length >= (mode === "bus" ? 0.8 : 0.5)) continue;
    pieces.push(coords);
    usedFallback++;
  }
  if (!pieces.length) return null;
  // remove duplicate routes (opposite direction, variants) and clip to Berlin
  pieces.sort((a, b) => polyLength(b) - polyLength(a));
  const covered = new Set();
  const CELL = 25;
  const cell = (p) => Math.floor((p[1] * KX) / CELL) + "," + Math.floor((p[0] * KY) / CELL);
  const isCovered = (p) => {
    const cx = Math.floor((p[1] * KX) / CELL), cy = Math.floor((p[0] * KY) / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (covered.has(cx + i + "," + (cy + j))) return true;
    return false;
  };
  const parts = [];
  for (const pl of pieces) {
    const dense = densify(pl, 15);
    const keep = dense.map((p) => !isCovered(p) && (clip ? inBerlin(p[0], p[1]) : mode === "S" ? inWideArea(p[0], p[1]) : true));
    // mark what is kept as covered
    // (after deciding the whole shape, so it does not cover itself)
    let i = 0;
    while (i < dense.length) {
      if (!keep[i]) { i++; continue; }
      let j = i;
      while (j + 1 < dense.length && keep[j + 1]) j++;
      const run = dense.slice(Math.max(0, i - 1), Math.min(dense.length, j + 2));
      if (run.length >= 2 && polyLength(run) > 40) parts.push(run);
      i = j + 1;
    }
    for (let k = 0; k < dense.length; k++) if (keep[k]) covered.add(cell(dense[k]));
  }
  if (!parts.length) { report.dropped.push(`${mode} ${name}`); return null; }
  const geom = parts
    .map((p) => rdp(p, TOL[mode]))
    .map((p) => p.map(([lat, lng]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5]))
    .filter((p) => p.length >= 2);
  const total = parts.reduce((s, p) => s + polyLength(p), 0);
  if (mode === "bus" && total < 800) { report.dropped.push(`bus ${name} (${Math.round(total)} m in Berlin)`); return null; }
  const color = mode === "U" || mode === "S" ? COLORS[name] || "#666666" : mode === "tram" ? TRAM_COLOR : BUS_COLOR;
  const props = { mode, name, color };
  if (mode === "bus" && /^(M\d+|X\d+|\d?M\d+)$/.test(name)) props.metro = true;
  if (mode === "bus" && /^N\d+/.test(name)) props.night = true;
  return { type: "Feature", properties: props, geometry: { type: "MultiLineString", coordinates: geom }, _len: total, _fb: usedFallback };
}

for (const entry of byName.values()) {
  const f = buildLine(entry);
  if (f) featuresByMode[entry.mode].push(f);
}

// U-Bahn sections with no train in the data (covered by replacement buses, "bus" lines named U6, U7...):
// their stations are joined in order and marked `closed` so they are drawn dashed.
// Only pure U stations are used: no "/" or "[" in the name (bus stops next to the station).
const uAdj = new Set();
for (const l of lines) {
  if (l.product !== "subway") continue;
  for (const v of l.variants) {
    const ps = v.stops.map(parentId);
    for (let i = 0; i < ps.length - 1; i++) { uAdj.add(ps[i] + ">" + ps[i + 1]); uAdj.add(ps[i + 1] + ">" + ps[i]); }
  }
}
const closedDone = new Set();
const closedSegments = {};
for (const l of lines) {
  if (l.product !== "bus" || !/^U[1-9]$/.test(l.name)) continue;
  for (const v of l.variants) {
    const ps = v.stops.map(parentId);
    const names = ps.map((p) => parentName.get(p) || "");
    if (!names.every((n) => /^(S\+U|U) [^/[]+$/.test(n))) continue;
    for (let i = 0; i < ps.length - 1; i++) {
      if (uAdj.has(ps[i] + ">" + ps[i + 1])) continue;
      const key = [ps[i], ps[i + 1]].sort().join(">");
      if (closedDone.has(key)) continue;
      closedDone.add(key);
      const a = parentLoc.get(ps[i]), b = parentLoc.get(ps[i + 1]);
      if (!a || !b) continue;
      (closedSegments[l.name] = closedSegments[l.name] || []).push([a, b]);
      for (const [pid, loc] of [[ps[i], a], [ps[i + 1], b]]) {
        const isNew = !stationAgg.has(pid);
        if (isNew) stationAgg.set(pid, { name: parentName.get(pid), locs: [], lines: new Set(), modes: new Set(), closed: new Set() });
        const st = stationAgg.get(pid);
        if (isNew) { st.locs.push(loc); st.lines.add(l.name); st.modes.add("U"); st.closed.add(l.name); }
      }
    }
  }
}
for (const [name, segs] of Object.entries(closedSegments)) {
  featuresByMode.U.push({
    type: "Feature",
    properties: { mode: "U", name, color: COLORS[name] || "#666666", closed: true },
    geometry: { type: "MultiLineString", coordinates: segs.map((s) => s.map(([lat, lng]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5])) },
  });
  report.closed = (report.closed || []).concat(`${name}: ${segs.length} tramos`);
}

// Stations
const stationFeatures = [];
// The same name with several station ids (U2 and U6 platforms at Stadtmitte...) is merged if they are within 450 m.
const clusters = [];
for (const a of stationAgg.values()) {
  const nm = a.name.replace(/^(S\+U|S|U) /, "");
  const lat = a.locs.reduce((s, p) => s + p[0], 0) / a.locs.length;
  const lng = a.locs.reduce((s, p) => s + p[1], 0) / a.locs.length;
  const c = clusters.find((c) => c.name === nm && dist([c.lat, c.lng], [lat, lng]) < 450);
  if (c) {
    c.lat = (c.lat * c.n + lat) / (c.n + 1); c.lng = (c.lng * c.n + lng) / (c.n + 1); c.n++;
    a.lines.forEach((l) => c.lines.add(l));
    if (!a.closed || !a.closed.size) c.closedOnly = false;
    if (a.closed) a.closed.forEach((l) => c.closed.add(l));
  } else {
    clusters.push({ name: nm, lat, lng, n: 1, lines: new Set(a.lines), closed: new Set(a.closed || []), closedOnly: !!(a.closed && a.closed.size) });
  }
}
for (const c of clusters) {
  const ls = [...c.lines].sort((x, y) => x[0].localeCompare(y[0]) || parseInt(x.slice(1)) - parseInt(y.slice(1)));
  // a station is marked "closed" only if it has no line with trains; otherwise the closed lines go in `closed`
  const closed = [...c.closed].filter((l) => !c.closedOnly ? false : true);
  stationFeatures.push({
    type: "Feature",
    properties: { mode: "station", name: c.name, lines: ls, ...(closed.length ? { closed } : {}) },
    geometry: { type: "Point", coordinates: [Math.round(c.lng * 1e5) / 1e5, Math.round(c.lat * 1e5) / 1e5] },
  });
}

// Stable order
const naturalSort = (a, b) => a.properties.name.localeCompare(b.properties.name, "en", { numeric: true });
for (const m of Object.keys(featuresByMode)) featuresByMode[m].sort(naturalSort);
stationFeatures.sort((a, b) => a.properties.name.localeCompare(b.properties.name));

const all = [...featuresByMode.U, ...featuresByMode.S, ...featuresByMode.tram, ...featuresByMode.bus, ...stationFeatures];
for (const f of all) { if (f._fb) report.fallback.push(`${f.properties.mode} ${f.properties.name}(${f._fb})`); delete f._len; delete f._fb; }
const fc = { type: "FeatureCollection", features: all };
fs.writeFileSync(OUT, JSON.stringify(fc));

// ---------- report ----------
const size = fs.statSync(OUT).size;
const sizeBy = {};
for (const f of all) sizeBy[f.properties.mode] = (sizeBy[f.properties.mode] || 0) + JSON.stringify(f).length;
console.log(`transit.geojson: ${(size / 1024).toFixed(0)} KB`);
console.log("Bytes per mode:", sizeBy);
for (const m of ["U", "S", "tram", "bus"]) console.log(`${m}: ${featuresByMode[m].length} lines: ${featuresByMode[m].map((f) => f.properties.name).join(" ")}`.slice(0, 600));
console.log(`U/S stations: ${stationFeatures.length}`);
const missingU = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9"].filter((n) => !featuresByMode.U.some((f) => f.properties.name === n));
console.log("Missing U1-U9:", missingU.length ? missingU.join(", ") : "none");
console.log("U-Bahn sections with no train in the data (drawn dashed):", (report.closed || []).join(", ") || "-");
console.log("Synthetic (completed from stations):", report.synthetic.join(", ") || "-");
console.log("No shape, joined by stations:", report.fallback.join(", ") || "-");
console.log(`Dropped: ${report.dropped.length}`);
