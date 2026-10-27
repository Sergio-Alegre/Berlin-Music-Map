# Berlin Music Map: instructions for Claude Code

This repository holds a data set of places in Berlin where classical music is taught (any instrument, including voice) and the generator of an interactive map. Start with `README.md`, then `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`, `docs/PIPELINE.md` and `docs/MAP.md`.

## Working rules

- Python command: `py` on Windows, `python3` on Linux. Node.js 18+.
- Read-only on the web: never fill in forms, create accounts or contact any entity.
- No invented data. Every fact needs a source URL; emails only from an official page of the entity.
- No personal data: do not record names of people, individual teachers or private email addresses. Visitors' own data (name, email, CV) lives only in their browser.
- Every data change must pass `py scripts/validate.py data/jobs.json --require-geo` before it is considered done.
- Dates are ISO (`2026-10-16`); check today's date with `date`.
- Sub-agents are defined in `.claude/agents/` (model and effort are set in their front matter; do not override them). Agents added to that folder during a session are only loaded after a restart.
- Geocoding: `node scripts/geocode.js` calls Nominatim at most once per second and needs `NOMINATIM_CONTACT` set to a contact email or URL. Results are cached.
- Copy for the interface and the documentation is English. Check spelling and grammar.

## Typical tasks

- Refresh data: follow `docs/PIPELINE.md`.
- Change the map: edit `src/`, rebuild with `py scripts/build_map.py`, run `node scripts/test_mail.js` and `node scripts/smoke_map.js`. Never give Leaflet marker icons `position: relative`.
- Add a category or instrument family: edit `data/categories.json` / `data/instruments.json` and `data/schema.json`, update `docs/DATA-MODEL.md` and `docs/MAP.md`.
