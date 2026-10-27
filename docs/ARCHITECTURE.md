# Architecture

Berlin Music Map is a static data set plus a generator that turns it into one self-contained web page.

```
data/raw/<district>.json   one file per Berlin district, written by district scouts
        │  scripts/merge.py          merge, de-duplicate, apply data/exclusions.json
        ▼
data/jobs.json             canonical data set
        │  scripts/geocode.js        Nominatim, 1 request/s, cached in data/geo/geocode-cache.json
        │  scripts/enrich_stations.js   nearest U-/S-Bahn station
        │  scripts/validate.py       schema + cross-field rules
        ▼
scripts/build_map.py       embeds Leaflet, CSS, JS and the data into one HTML
        ▼
dist/berlin-music-map.html
```

## Folders

| Path | Contents |
| --- | --- |
| `data/schema.json` | JSON Schema of one entity |
| `data/categories.json` | Entity categories (colour, layer, keywords) |
| `data/instruments.json` | Instrument families used to filter the map |
| `data/raw/` | Source data per district (`<slug>.json`) and notes (`<slug>.notes.md`) |
| `data/jobs.json` | Merged data set (generated) |
| `data/exclusions.json` | `{ "entity-id": "reason" }`: entities removed at merge time |
| `data/geo/` | District borders, transit lines, geocoding cache |
| `data/sources.md` | Directories and portals, with search patterns |
| `data/reference/` | Background material (municipal fee tables, social security notes) |
| `scripts/` | Pipeline scripts and tests |
| `src/` | Map front-end (`map.template.html`, `map.css`, `map.js`, `mail.js`) |
| `dist/` | Built map (generated) |
| `.claude/agents/` | Sub-agent definitions used to collect and verify data |
| `docs/` | This documentation |

## Requirements

Node.js 18 or newer with npm, and Python 3.9 or newer (`py` on Windows, `python3` on Linux). In `scripts/`: `npm install` (installs Leaflet and the VBB transit packages).

## Design decisions

- **One data set, one page.** The page embeds all data; only base-map tiles come from the internet (Esri World Light Gray by default, OpenStreetMap as alternative). It works from `file://`.
- **No personal data in the data set or the page.** Settings (name, email, signature, CV link, CV file) are typed by each visitor and stay in that browser (`localStorage`/IndexedDB). The server never sees them.
- **Districts (Bezirke), not neighbourhoods.** The 12 districts bound the search work and validate every coordinate against `data/geo/bezirke.geojson`.
- **Deterministic steps are scripts, not agents.** Agents only collect and check facts; merging, geocoding, validating and building are reproducible.
- **Every fact has a source URL.** Emails are only kept when they appear on an official page of the entity; individuals' names and private email addresses are not recorded.
