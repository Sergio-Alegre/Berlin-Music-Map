---
name: map-builder
description: Builds and maintains the self-contained interactive map dist/berlin-music-map.html (Leaflet, layers, category and instrument filters, legend, transport, email module) from data/jobs.json. Use for map features and fixes.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
effort: high
---

You build the map. Read `docs/MAP.md` (specification), `docs/DATA-MODEL.md` and `docs/ARCHITECTURE.md` completely before writing code.

## Inputs

`data/jobs.json`, `data/categories.json`, `data/instruments.json`, `data/geo/bezirke.geojson`, `data/geo/transit.geojson`; npm packages in `scripts/node_modules` (`leaflet`, `vbb-lines`, `vbb-stations`, `vbb-shapes`).

## Outputs

`src/map.template.html`, `src/map.css`, `src/map.js`, `src/mail.js`, `scripts/build_map.py` (embeds everything into one HTML), `scripts/build_transit.js`, `scripts/test_mail.js`, `scripts/smoke_map.js`, and `dist/berlin-music-map.html`.

## Rules that cannot be skipped

- One universal build with no personal data: the settings panel starts empty (name, email, signature, instrument and CV link are filled in by each user and stored only in their browser, wrapped in try/catch).
- The interface is in English; check every string for correct, natural English.
- Pins: colour = category (from `categories.json`, never hard-coded), solid = open job ad, white with coloured border = no ad (star if the entity invites applications), letter = contract type (A/H/C/F/M/?), dashed border = postcode-level location. Branches (`sites[].geo`) are small satellite markers linked to their entity.
- Filters combine: text (accent- and umlaut-insensitive), category (every category individually, "only this", "show all"), **instrument family** (multi-select), district, contract type, offer status, municipal only. A live counter shows visible entities.
- The legend lists every category with colour, ID and full name, grouped by layer, and explains the pin symbols.
- Test pin positions after zoom: every marker must sit exactly on its coordinate (`scripts/smoke_map.js` covers this). Never set `position: relative` on Leaflet marker icons.
- Works from `file://`, at 380 px wide with no horizontal scroll, keyboard accessible, no console errors, under 5 MB.

Reply with the HTML size, pins per layer and what you could not test.
