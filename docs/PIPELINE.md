# Pipeline: how to update the data

## 1. Collect (agents)

Launch one `district-scout` per district (all twelve can run in parallel; if rate limits hit, run two batches of six). Each reads `data/raw/<slug>.json`, annotates the instruments of existing entities, adds new ones and writes the file back. The prompt must give the exact district name and slug.

Slugs: `mitte`, `friedrichshain-kreuzberg`, `pankow`, `charlottenburg-wilmersdorf`, `spandau`, `steglitz-zehlendorf`, `tempelhof-schoeneberg`, `neukoelln`, `treptow-koepenick`, `marzahn-hellersdorf`, `lichtenberg`, `reinickendorf`.

Tips learned in earlier runs:

- Overpass (OpenStreetMap API) is often unreachable; directories (Das Örtliche, Gelbe Seiten, miz.org) fetched with `curl` work well and do not use web-search quota.
- Web-search quota is shared between parallel agents. Cap each agent (about 15 searches) and prefer direct fetches.
- Make agents save a partial file early; a cut-off session then loses nothing.
- Job portals (Karriereportal Berlin, nmz Stellenmarkt) can be crawled with `curl`; closed ads on the Karriereportal answer HTTP 410.

## 2. Build the data set (scripts)

```
py scripts/merge.py               # data/raw/*.json -> data/jobs.json (applies data/exclusions.json)
node scripts/geocode.js           # coordinates for entities and branches (1 request/s, cached)
node scripts/enrich_stations.js   # nearest U-/S-Bahn station
py scripts/validate.py data/jobs.json --require-geo
```

Geocoding needs a contact in the User-Agent: set `NOMINATIM_CONTACT` (an email or URL) first, as OpenStreetMap's usage policy requires.

## 3. Verify (agents)

Split the entities into slices (`data/verify/slice-N.json`, about 40 each) and launch one `link-verifier` per slice. Apply their findings to `data/raw/` (fix or delete a URL or email, turn an expired ad into `none_found`), then repeat step 2. Emails that only appear obfuscated on the entity's site (`(at)`, JavaScript) are kept with `contact.email_obfuscated: true`; the map warns about them.

## 4. Build

```
node scripts/build_transit.js     # only when transit data must be refreshed
py scripts/build_map.py           # dist/berlin-music-map.html
node scripts/test_mail.js && node scripts/smoke_map.js
```

## 5. Review

Launch `qa-reviewer` and fix what it finds (`docs/QA.md`). Manual checks that need a real browser or mail client are listed in its report.

## Calendar

Ads expire and municipal conditions change in January (fee agreement for municipal music schools). Re-run steps 1 to 5 at least once a year; re-run `link-verifier` every few months.

## Notes from the last run

- Nominatim rejects placeholder contacts (for example `example.org`) with HTTP 403. Set `NOMINATIM_CONTACT` to a real email or to the project's URL. `geocode.js` now aborts a request after 20 seconds.
- `scripts/build_map.py` accepts `--jobs <file>` (build from another data file, used by the tests), `--out <file>`, and the environment variable `FORBIDDEN_STRINGS` (comma separated; the build fails if the output contains one).
- `scripts/smoke_map.js` saves screenshots into the folder named by the environment variable `SHOT`.
- `test_mail.js` needs `mailparser`: install it in a temporary folder and point `MAILPARSER_DIR` to it.
