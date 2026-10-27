# Map specification

The map is a single HTML file, in English, built by `scripts/build_map.py` from `src/` and `data/`. Leaflet 1.9.4 is the only library.

## Layers and filters

| Layer | Content | Default |
| --- | --- | --- |
| Teaching · Music | MUN, PRV, PNO, WND, EDU, HOC, ENS, OUT, each with its own switch | visible |
| Singing & choirs | CHO | visible |
| Public transport | U-Bahn, S-Bahn (visible), tram, bus (hidden), each with a switch | U and S visible |
| District boundaries | outline of the 12 districts | hidden |

A layer switch turns all its categories on or off. Every category also has "only this" and the panel has "Show all categories".

Filters (all combine; a live counter shows visible entities): free text (case-, accent- and umlaut-insensitive), **instrument family** (multi-select: strings, piano and keyboards, woodwind, brass, guitar and plucked strings, accordion, voice and singing, percussion), district, contract type, offer status, municipal only. The selection is remembered in the browser (wrapped in try/catch).

## Pins

| Element | Meaning |
| --- | --- |
| Colour | Category (from `data/categories.json`) |
| Solid fill | Open job ad |
| White with coloured border | No ad (star: invites applications) |
| Letter | Contract type: A employment, H hourly fee, C commission or room rent, F freelance, M mixed, ? unknown |
| Larger pin | Municipal entity |
| Dashed border | Approximate location (postcode only) |
| Small satellite marker | A branch (`sites[].geo`) of an entity; opens the main entity's popup |

Pins that share a coordinate are spread 36 px apart on screen. Marker icons must keep Leaflet's `position: absolute`; a regression test checks that every marker sits exactly on its coordinate at several zoom levels.

## Popup

Name, category (colour and full name), district, nearest station with walking distance, offer status (title, deadline, link), contract type and the evidence phrase, known conditions (pay, hours, requirements), instruments offered (families and detail), contact (website, phone, email, application portal), buttons **Email**, **Email + CV (.eml)**, **Copy text**, **Apply via portal**, **Directions**, **Sources**, and the date of last verification. An email that only appears obfuscated on the entity's site carries a warning.

## Email module

A `mailto:` link cannot attach files, so there are two routes: **Email** (a `mailto:` with the CV as a link in the text; a dialog explains this once and can be switched off) and **Email + CV (.eml)** (a draft with the PDF attached and the `X-Unsent: 1` header; Thunderbird opens it as a message, use "Edit as New"). **Copy text** copies subject and body.

Settings (collapsed panel, stored only in the visitor's browser): name, email (From header of the `.eml`), teaching languages, signature, CV link, CV file (IndexedDB), instrument and short bio per template language, templates in German, English, Spanish and Italian with variants "posted offer" and "spontaneous application". Export and import as JSON. Template variables: `{{greeting}}`, `{{entity_name}}`, `{{position_title}}`, `{{offer_url}}`, `{{my_name}}`, `{{instrument}}`, `{{languages}}`, `{{bio}}`, `{{cv_link}}`, `{{signature}}`, `{{role}}`.

The greeting is addressed to the team of the entity ("Sehr geehrtes Team von …", "Dear … team", "Estimado equipo de …:", "Gentile team di …,"). Names of people are not stored in the data, so no salutation is guessed.

## Legend

Generated from `data/categories.json` and `data/instruments.json`: colour, ID and full name for each category, grouped by layer, plus the pin symbols and transit lines.

## Technical requirements

Works from `file://`; at 380 px wide with no horizontal scroll; keyboard accessible; no console errors; below 5 MB; every browser-storage access wrapped in try/catch. Base map: Esri World Light Gray (default) and OpenStreetMap standard, with attribution; tiles are the only network dependency, and the map shows a notice after repeated tile failures.

## Possible extension

Places that accept long-term concert proposals (venues, series, festivals). The layout leaves room for a further layer and category set; see `docs/ARCHITECTURE.md`.
