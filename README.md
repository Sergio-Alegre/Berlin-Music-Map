# Berlin Music Map

This is an interactive map that allows you to check the location and contact information of possible teaching positions and ensembles, both for instruments and singing. And in the future, concert venues to send proposals to.

Live version: [sergioalegre.com/berlin-music-map](https://sergioalegre.com/berlin-music-map/)

The map is one [self-contained HTML file](dist/berlin-music-map.html). You can open it directly in a browser or serve it as a static file.

## Features

- Pins by category (teaching, choirs); toggle or solo each.
- Filters: instrument family, district, contract type, job-ad status, free text.
- School branches as satellite markers.
- Transit lines (U-Bahn, S-Bahn, tram, bus); nearest station per place.
- Email per place: `mailto:` or `.eml` draft with CV attached. Name, signature, CV stay in browser.

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

The data set contains only publicly listed institutions (address, website, contact), reproduced as each institution publishes it on its own pages. That includes a few contact addresses on free-mail providers and one business name that contains a person's name. Facts come from official pages of each institution; each entry lists its sources and the date it was last verified. If you spot a mistake or want an entry removed, open an issue.

Base-map tiles: Esri World Light Gray and OpenStreetMap (© OpenStreetMap contributors). Transit data: VBB open data through the `vbb-*` npm packages. District borders: [funkeinteraktiv/Berlin-Geodaten](https://github.com/funkeinteraktiv/Berlin-Geodaten).

## License

[MIT License](LICENSE). Third-party licenses and data sources: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Privacy

Berlin Music Map ist eine in sich geschlossene HTML-Datei und läuft vollständig im Browser (clientseitig). Es werden keine Daten an meinen Server oder an Dritte übermittelt, und es werden keine Cookies verwendet. Einstellungen, Profil und Lebenslauf bleiben ausschließlich auf Ihrem Gerät, im lokalen Speicher Ihres Browsers. Die Kartenkacheln werden direkt von den Servern von Esri und OpenStreetMap geladen; diese erhalten dabei technisch bedingt Ihre IP-Adresse.

Berlin Music Map is a self-contained HTML file and runs fully client-side. It does not send any information to my server or to anyone else, and it uses no cookies. Settings, profile and CV stay only on your device, in your browser's local storage. The base-map tiles are loaded directly from Esri and OpenStreetMap servers, which receive your IP address, as in any online map.
