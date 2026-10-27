# Berlin Music Map

An interactive map of places in Berlin where classical music is taught: municipal and private music schools, schools with instrument classes, piano schools, wind bands and wind schools, choirs and singing schools, conservatories and youth orchestras. For each place it records the instrument families offered, whether it is hiring, the kind of contract, and how to get in touch. Built for music teachers looking for work, and meant to grow into a map of venues that accept long-term concert proposals.

The map is one self-contained HTML file (`dist/berlin-music-map.html`). Open it in a browser, or serve it as a static file. Only the base-map tiles come from the internet.

## Features

- Pins by category, with layers for music teaching and for singing and choirs; every category can be switched on or off, or shown alone.
- Filters by instrument family (strings, piano and keyboards, woodwind, brass, guitar and plucked strings, accordion, voice, percussion), district, contract type, job-ad status, and free text.
- Branches of schools drawn as small satellite markers.
- Public transport lines (U-Bahn, S-Bahn, tram, bus) and nearest station for each place.
- A short email dialog per place: a `mailto:` link or an `.eml` draft with your CV attached. Your name, signature and CV stay in your browser only.

## Quick start

```
cd scripts && npm install && cd ..
py scripts/build_map.py            # python3 on Linux
```

Open `dist/berlin-music-map.html`. To refresh the data, see [docs/PIPELINE.md](docs/PIPELINE.md).

## Documentation

| File | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Folders, data flow, design decisions |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Entity fields, categories, rules |
| [docs/PIPELINE.md](docs/PIPELINE.md) | How to collect, verify and rebuild |
| [docs/MAP.md](docs/MAP.md) | Map specification |
| [docs/QA.md](docs/QA.md) | Release checklist |
| [CLAUDE.md](CLAUDE.md) | Instructions for Claude Code and the sub-agents in `.claude/agents/` |

## Data and privacy

The data set contains only publicly listed institutions (address, website, institutional contact). It does not contain names of people, individual teachers or private email addresses. Facts come from official pages of each institution; each entry lists its sources and the date it was last verified. If you spot a mistake or want an entry removed, open an issue.

Base-map tiles: Esri World Light Gray and OpenStreetMap (© OpenStreetMap contributors). Transit data: VBB open data through the `vbb-*` npm packages. District borders: [funkeinteraktiv/Berlin-Geodaten](https://github.com/funkeinteraktiv/Berlin-Geodaten).
