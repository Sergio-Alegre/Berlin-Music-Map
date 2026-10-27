# QA checklist

## Data

- [ ] 100 % of entities validate against `data/schema.json` (`scripts/validate.py --require-geo`).
- [ ] No point outside Berlin or outside its district; approximate points are drawn dashed.
- [ ] The 12 municipal music schools are present, with their branches.
- [ ] Every entity has at least one instrument family; instrument filters return plausible results.
- [ ] Open job ads were checked in the last 48 hours and have not expired.
- [ ] Every email appears on its source page (or is flagged `email_obfuscated`).
- [ ] No names of people and no private email addresses in the data.
- [ ] Counts in `data/jobs.json`, the data embedded in the HTML and the legend agree.

## Map (desktop and 380 px)

- [ ] Every layer and every category switches on and off; "only this" and "Show all categories" work; the legend matches `categories.json`.
- [ ] Every instrument-family filter works alone and combined with category, district and text.
- [ ] Every marker sits exactly on its coordinate after zooming (`scripts/smoke_map.js`).
- [ ] Five random popups show correct data.
- [ ] The mail link keeps ä, ö, ü, ß, é, ñ in subject and body; the greeting names the entity and uses the right language.
- [ ] The `.eml` opens with the PDF attached in Thunderbird and sends with "Edit as New".
- [ ] Settings survive a reload and can be exported and imported.
- [ ] No personal data in the HTML; no console errors; file below 5 MB; works from disk.
- [ ] All interface text is correct, natural English.
