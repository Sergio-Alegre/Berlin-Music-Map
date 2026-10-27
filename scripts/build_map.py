#!/usr/bin/env python3
"""Build dist/berlin-music-map.html: one HTML file with Leaflet, CSS, JS and the data embedded.

Usage (Windows: py; Linux: python3):
    py scripts/build_map.py
    py scripts/build_map.py --out other.html --jobs path/to/jobs.json   # e.g. for tests with fixture data

The build contains no personal data. To make sure of it, set FORBIDDEN_STRINGS to a comma-separated list
(for example FORBIDDEN_STRINGS="Jane Doe,jane@example.org"); the build fails if the output contains any of them
(case-insensitive).

Inputs: data/jobs.json, data/categories.json, data/instruments.json, data/geo/bezirke.geojson,
data/geo/transit.geojson (scripts/build_transit.js), src/*, scripts/node_modules/leaflet.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEAFLET = ROOT / "scripts" / "node_modules" / "leaflet" / "dist"

# Fields the map does not use: dropped to keep the HTML small.
DROP_ENTITY = {"found_by"}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def trim_entity(e: dict) -> dict:
    return {k: v for k, v in e.items() if k not in DROP_ENTITY}


def rdp(points, tol):
    """Iterative Ramer-Douglas-Peucker on [lng, lat]; tol in degrees (approximate)."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        s, e = stack.pop()
        ax, ay = points[s]
        bx, by = points[e]
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        md, mi = 0.0, -1
        for i in range(s + 1, e):
            px, py = points[i]
            if l2 == 0:
                d = ((px - ax) ** 2 + (py - ay) ** 2) ** 0.5
            else:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
                d = ((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2) ** 0.5
            if d > md:
                md, mi = d, i
        if md > tol and mi > 0:
            keep[mi] = True
            stack.append((s, mi))
            stack.append((mi, e))
    return [p for p, k in zip(points, keep) if k]


def simplify_districts(gj: dict, tol_m: float = 12.0) -> dict:
    tol = tol_m / 111320.0
    feats = []
    for f in gj["features"]:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        new_polys = []
        for poly in polys:
            rings = []
            for ring in poly:
                r = rdp([(round(x, 5), round(y, 5)) for x, y in ring], tol)
                if len(r) >= 4:
                    rings.append([[x, y] for x, y in r])
            if rings:
                new_polys.append(rings)
        geom = {"type": "MultiPolygon", "coordinates": new_polys}
        feats.append({"type": "Feature", "properties": {"name": f["properties"]["name"]}, "geometry": geom})
    return {"type": "FeatureCollection", "features": feats}


def dumps(obj) -> str:
    """Compact JSON, safe inside <script>: '</' and '<!--' are escaped."""
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return s.replace("</", "<\\/").replace("<!--", "<\\!--").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def fill(template: str, token: str, content: str) -> str:
    marker = f"<!--@@{token}@@-->"
    if marker not in template:
        sys.exit(f"Missing marker {marker} in the template")
    # str.replace does not interpret backslashes: the content goes in as it is
    return template.replace(marker, content, 1)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", help="output file (default dist/berlin-music-map.html)")
    ap.add_argument("--jobs", help="entity data (default data/jobs.json); for tests with fixture data")
    args = ap.parse_args()

    out = Path(args.out) if args.out else ROOT / "dist" / "berlin-music-map.html"
    jobs_path = Path(args.jobs) if args.jobs else ROOT / "data" / "jobs.json"
    if not jobs_path.exists():
        sys.exit(f"Missing {jobs_path}: run scripts/merge.py, geocode.js and enrich_stations.js first")

    categories = read_json(ROOT / "data" / "categories.json")
    instruments = read_json(ROOT / "data" / "instruments.json")
    jobs = [trim_entity(e) for e in read_json(jobs_path)]
    cat_ids = {c["id"] for c in categories}
    inst_ids = {f["id"] for f in instruments}
    bad = sorted({e["id"] for e in jobs if e.get("category") not in cat_ids})
    if bad:
        sys.exit(f"Entities with an unknown category: {bad[:5]}")
    nogeo = [e["id"] for e in jobs if not e.get("geo")]
    if nogeo:
        sys.exit(f"Entities without coordinates (run geocode.js): {nogeo[:5]}")
    unknown_inst = sorted({i for e in jobs for i in e.get("instruments", []) if i not in inst_ids})
    if unknown_inst:
        sys.exit(f"Unknown instrument families: {unknown_inst}")
    without_inst = sum(1 for e in jobs if not e.get("instruments"))

    districts = simplify_districts(read_json(ROOT / "data" / "geo" / "bezirke.geojson"))
    transit_path = ROOT / "data" / "geo" / "transit.geojson"
    if not transit_path.exists():
        sys.exit("Missing data/geo/transit.geojson: run node scripts/build_transit.js")
    transit = read_json(transit_path)

    # categories.json carries long texts for the agents; the map only needs this
    cat_keep = ("id", "label_en", "layer", "color", "municipal")
    categories_slim = [{k: c[k] for k in cat_keep if k in c} for c in categories]
    instruments_slim = [{k: f[k] for k in ("id", "label_en", "examples_en") if k in f} for f in instruments]

    dates = [e.get("last_verified", "") for e in jobs] + [e.get("offer", {}).get("checked", "") for e in jobs]
    dates = [d for d in dates if d]
    meta = {"data_date": max(dates) if dates else "", "entities": len(jobs)}

    leaflet_css = (LEAFLET / "leaflet.css").read_text(encoding="utf-8")
    # Leaflet's images (layer switcher, default icons) are not used: remove them so no missing files are requested
    leaflet_css = re.sub(r"url\(images/[^)]*\)", "none", leaflet_css)
    leaflet_js = (LEAFLET / "leaflet.js").read_text(encoding="utf-8")
    leaflet_js = re.sub(r"\n?//# sourceMappingURL=.*", "", leaflet_js)
    if "</script" in leaflet_js.lower():
        sys.exit("leaflet.js contains </script")

    src = ROOT / "src"
    tpl = (src / "map.template.html").read_text(encoding="utf-8")
    parts = {
        "LEAFLET_CSS": leaflet_css,
        "MAP_CSS": (src / "map.css").read_text(encoding="utf-8"),
        "LEAFLET_JS": leaflet_js,
        "MAIL_JS": (src / "mail.js").read_text(encoding="utf-8"),
        "MAP_JS": (src / "map.js").read_text(encoding="utf-8"),
    }
    for name, text in parts.items():
        if "</script" in text.lower() or "</style" in text.lower():
            sys.exit(f"{name} contains a closing tag that would break the HTML")
    data = {
        "DATA_CATEGORIES": dumps(categories_slim),
        "DATA_INSTRUMENTS": dumps(instruments_slim),
        "DATA_JOBS": dumps(jobs),
        "DATA_DISTRICTS": dumps(districts),
        "DATA_TRANSIT": dumps(transit),
        "DATA_META": dumps(meta),
    }
    # code first (it may contain "<!--@@" only if someone writes it on purpose), then the data
    html = tpl
    for token, content in list(parts.items()) + list(data.items()):
        html = fill(html, token, content)
    left = re.findall(r"<!--@@\w+@@-->", html)
    if left:
        sys.exit(f"Markers left unreplaced: {left}")

    # Optional guard against personal data: FORBIDDEN_STRINGS="name one,name two,me@example.org"
    forbidden = [x.strip() for x in os.environ.get("FORBIDDEN_STRINGS", "").split(",") if x.strip()]
    low = html.lower()
    found = [x for x in forbidden if x.lower() in low]
    if found:
        sys.exit(f"The output contains forbidden strings (FORBIDDEN_STRINGS): {found}")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8", newline="\n")
    size = out.stat().st_size
    print(f"{out}  {size / 1024 / 1024:.2f} MB ({size:,} bytes)")
    print(f"  places with a pin: {len(jobs)} · transit features: {len(transit['features'])} · forbidden-string check: {len(forbidden)} strings")
    if without_inst:
        print(f"  NOTE: {without_inst} places have no instrument families yet; the instrument filter skips them")
    if size > 5 * 1024 * 1024:
        print("  WARNING: over 5 MB; simplify the bus lines more (node scripts/build_transit.js --bus-tol 25)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
