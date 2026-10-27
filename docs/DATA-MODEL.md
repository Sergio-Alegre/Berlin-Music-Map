# Data model

`data/schema.json` is the machine-readable contract; `scripts/validate.py` applies it plus cross-field rules. One entity, as an example:

```json
{
  "id": "mitte-example-music-school",
  "name": "Example Music School",
  "category": "PRV",
  "secondary_categories": [],
  "district": "Mitte",
  "address": { "street": "Examplestraße 1", "postcode": "10115", "city": "Berlin" },
  "sites": [{ "name": "Branch Wedding", "street": "Beispielweg 2", "postcode": "13347" }],
  "instruments": ["strings", "keyboard", "voice"],
  "instruments_detail": ["violin", "cello", "piano", "singing"],
  "contact": {
    "email": "info@example.org", "email_source_url": "https://example.org/impressum",
    "phone": "+49 30 000000", "website": "https://example.org"
  },
  "offer": { "status": "initiative_welcome", "title": "Teachers wanted", "url": "https://example.org/jobs", "checked": "2026-10-16" },
  "contract": { "type": "honorar_hourly", "evidence": "auf Honorarbasis" },
  "conditions": { "pay": "…", "hours": "…", "requirements": "…" },
  "email_language": "de",
  "summary_en": "Private school teaching strings, piano and voice to children and adults.",
  "sources": ["https://example.org"],
  "found_by": "district-scout:mitte",
  "last_verified": "2026-10-16"
}
```

After `geocode.js` and `enrich_stations.js` each entity also carries `geo` (`lat`, `lng`, `precision`: `address` | `street` | `postcode`, `source`) and `nearest_station` (`name`, `distance_m`). Branches in `sites` get their own `geo`.

## Closed values

| Field | Values |
| --- | --- |
| `category` | ids in `data/categories.json` (MUN, PRV, PNO, WND, EDU, HOC, ENS, OUT, CHO) |
| `instruments` | family ids in `data/instruments.json`: `strings`, `keyboard`, `woodwind`, `brass`, `guitar_plucked`, `accordion`, `voice`, `percussion` |
| `offer.status` | `posted` (concrete open ad with URL), `initiative_welcome` (invites applications), `none_found` |
| `contract.type` | `employment`, `honorar_hourly`, `honorar_commission` (commission or room rent), `freelance_project`, `mixed`, `unknown` |
| `geo.precision` | `address`, `street`, `postcode` (approximate, drawn with a dashed border) |
| `email_language` | `de`, `en`, `es`, `it` (language of the default email template) |

## Categories

| ID | Name | Layer |
| --- | --- | --- |
| MUN | Municipal music school | Teaching · Music |
| PRV | Private music school or academy | Teaching · Music |
| PNO | Piano school | Teaching · Music |
| WND | Wind band or wind school | Teaching · Music |
| EDU | School or college with instrument classes | Teaching · Music |
| HOC | Conservatory or university music department | Teaching · Music |
| ENS | Amateur or youth orchestra and ensemble | Teaching · Music |
| OUT | Music outreach programme | Teaching · Music |
| CHO | Choir or vocal institution | Singing & choirs |

A school that teaches several subjects stays in its general category (`PRV`, `MUN`, `EDU`): a music academy that also offers singing or piano is `PRV`, not `CHO` or `PNO`. The dedicated categories are for places whose main activity is that one subject. Everything a school teaches is recorded in `instruments`, and the map filters by instrument family regardless of category.

## Rules

- Unknown fields are omitted, never left empty.
- `posted` needs `title` and `url`; an `email` needs `email_source_url`; at least one contact route (email, website, phone or portal) is required.
- Each point must fall inside the polygon of its `district`.
- Individuals: no names of people, no private email addresses, no individual teachers.
- `contract.type` other than `unknown` needs a literal `evidence` phrase (or `is_guess: true`).
- IDs are unique: `<district-slug>-<name-slug>`.
