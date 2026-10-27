# Portals and directories by category

Search contract for the district scouts. Compiled on 2026-10-15. Each source carries its check status: **open** (loaded and read), **partial** (only seen in search results, or the page did not show what was sought), **blocked** (HTTP 403, 404, 429 or network error when opened from the collecting machine) or **not tried**.

Rules that apply to every source:

- A search result is not a source: open the page of the ad or of the institution before classifying it.
- On the Berlin Karriereportal an expired ad returns **HTTP 410 Gone**. A 410 equals `none_found`.
- The 2026 permanent-post calls of the municipal Musikschulen are generally addressed to freelance teachers (Honorarkräfte) already working at that school (Interessenbekundungsverfahren; for example Lichtenberg, deadline 17.7.2026, "ausdrücklich an bestehende Honorarlehrkräfte"). Note this in `conditions.requirements` and do not treat the ad as a useful `posted` offer if it does not admit external applicants.
- The AV MuS-Honorare expires on 31.12.2026: municipal entries should note that the 2027 conditions are not yet published (see `data/reference/fees.md`).

## General job portals

| Portal | Status | How to search |
| --- | --- | --- |
| Karriereportal Berlin (Land and district offices) https://www.karriereportal-stellen.berlin.de/stellenangebote.html | open | List paginated 20 at a time with `?start=20`, `?start=40`, etc.; sortable with `order[field]` (`stellenbezeichnung`, `valid_until`) and `order[dir]`. The "Stichwort" field has no documented parameter: in practice search the web for `site:karriereportal-stellen.berlin.de Musikschullehrkraft Violine` and open each ad. Single ad: `https://www.karriereportal-stellen.berlin.de/<title>-de-j<id>.html` (append `?pdf=de` for the PDF version). Portal filters: Behörde, Tätigkeitsfeld ("Erziehung und Bildung"), Arbeitszeit (Teilzeit), Entgeltgruppe |
| praktischkommune.de https://praktischkommune.de/stadt/berlin | partial | Public-sector aggregator, 4,902 Berlin offers on the front page; no documented keyword pattern. Copies of Karriereportal ads with URLs like `https://praktischkommune.de/jobs/<id>-musikschullehrkraft-...-berlin`. Web search: `site:praktischkommune.de Musikschullehrkraft Berlin` |
| Bundesagentur für Arbeit, Jobbörse https://www.arbeitsagentur.de/jobsuche/ | partial | Ad detail at `https://www.arbeitsagentur.de/jobsuche/jobdetail/<refnr>`. Query: Musikschullehrer, Instrumentallehrer; place Berlin; radius 10 km per district. The search URL pattern was not tested |
| Indeed https://de.indeed.com | blocked (403) | Only via web search: `site:de.indeed.com Violine Lehrer Berlin Honorar`. Useful for private schools |
| Jooble https://de.jooble.org/stellenangebote-musikschule/Berlin | partial | Pages by trade and city: `/stellenangebote-musikschullehrer-violine`, `/stellenangebote-musikschule/Berlin`. Aggregates ads from other sources: check the original |
| Stepstone https://www.stepstone.de | blocked | Web search: `site:stepstone.de Musikschule Berlin Honorar` |
| LinkedIn Jobs | not tried | Location Berlin, keywords from the per-category table |
| interamt.de | not tried | Public-sector job portal; query "Musikschule", "Lehrkraft Musik" for Land Berlin |
| Kleinanzeigen (private lessons) | not tried | Category Unterricht & Kurse > Musik; only for category PRV and private pupils |

## Music and culture portals

| Portal | Status | How to search |
| --- | --- | --- |
| nmz Stellenmarkt https://www.nmz.de/stellenmarkt | open | Categories "Lehrkraft Musik (Musikschule/Schule/etc.)", "Orchester", "Hochschule", "Musikschulleitung", "Chorleitung", "Management". Ad: `/stellenmarkt/<slug>`. On 2026-10-15 there was no instrument teacher post in Berlin (only a part-time Künstlerische Leitung, deadline 14.9.2026) |
| Landesmusikrat Berlin https://www.landesmusikrat-berlin.de | partial | Link "Mitwirkung & Stellenausschreibungen" at `/uber-uns/#mitwirken` (content not read). Landesjugendorchester: `/jugendprojekte/landesjugendorchester-berlin/` |
| Barenboim-Said Akademie and Pierre Boulez Saal | open | Job notices as PDFs with the pattern `https://www.barenboimsaid.de/Administration/HR/<year>/<name>.pdf` and `https://www.boulezsaal.de/Administration/HR/<year>/<name>.pdf`; applications to `jobs@barenboimsaid.de` or `jobs@boulezsaal.de` depending on the notice |
| Konzerthaus Berlin https://www.konzerthaus.de/de/jobs | partial | Own portal; the list requires accepting external cookies |
| Verband deutscher Musikschulen (Stellenbörse), BDFM, DTKV Berlin | not tried | District scouts should try them for private Musikschulen and string teaching |
| Das Orchester (magazine, Stellenmarkt) | not tried | Teaching and ensemble posts in the classical sector |

## Directories and place maps

| Source | Status | Use |
| --- | --- | --- |
| List of the 12 municipal Musikschulen https://www.berlin.de/sen/kultur/kultureinrichtungen/musikschulen/adressen/ | open | Addresses and phone numbers of the Geschäftsstelle; no emails on that page |
| Berlin school directory (Schulverzeichnis) | not tried | Schools with music profiles, international schools and SESB |
| OpenStreetMap (Overpass) | not tried | Useful tags: `amenity=music_school`, `amenity=school`, `amenity=college`, `amenity=university`, `amenity=kindergarten`, `amenity=arts_centre` |
| Google Maps (web search only) | never copy coordinates | Queries: "Musikschule Violine <Bezirk>", "Klavierschule <Bezirk>", "Chor <Bezirk>" |

### Municipal Musikschulen (MUN)

| District | School | Website |
| --- | --- | --- |
| Mitte | Musikschule Fanny Hensel | https://www.berlin.de/musikschule-mitte/ (the Senate list gives `berlin.de/ba-mitte/musikschule/`) |
| Friedrichshain-Kreuzberg | Musikschule Friedrichshain-Kreuzberg | https://www.berlin.de/musikschule-friedrichshain-kreuzberg |
| Pankow | Musikschule Béla Bartók | https://www.berlin.de/ba-pankow/musikschule/index.html |
| Charlottenburg-Wilmersdorf | Musikschule City West | https://www.berlin.de/musikschule-charlottenburg-wilmersdorf/ |
| Spandau | Musikschule Spandau | https://www.berlin.de/musikschule-spandau/ |
| Steglitz-Zehlendorf | Leo-Borchard-Musikschule | https://www.berlin.de/musikschule-steglitz-zehlendorf/ |
| Tempelhof-Schöneberg | Musikschule Leo Kestenberg | https://www.lkms.de |
| Neukölln | Musikschule Paul Hindemith | https://www.berlin.de/musikschule-neukoelln/ |
| Treptow-Köpenick | Joseph-Schmidt-Musikschule | https://www.berlin.de/musikschule-treptow-koepenick/ |
| Marzahn-Hellersdorf | Hans-Werner-Henze-Musikschule | https://www.berlin.de/musikschule-mh/ |
| Lichtenberg | Schostakowitsch-Musikschule | https://www.musikschulelichtenberg.de (also https://www.schostakowitsch-musikschule.de) |
| Reinickendorf | Musikschule Reinickendorf | https://www.berlin.de/musikschule-reinickendorf/ |

Geschäftsstelle addresses (Senate list): Mathilde-Jacob-Platz 1, 10551 (Mitte; the school's own site gives as Geschäftsstelle Ruheplatzstr. 4, 13347, and four sites: Wallstraße 42, Turmstraße 75, Ruheplatzstraße 4, Swinemünder Str. 80); Mariannenplatz 2, 10997; Am Schloßpark 20, 13187; Berkaer Platz 1, 14199; Moritzstraße 17, 13597; Martin-Buber-Straße 21, 14163; Grunewaldstraße 6-7, 10823; Boddinstraße 34, 12053; Freiheit 15, 12555; Maratstraße 182, 12683; Paul-Junius-Straße 71, 10369; Ziekowstraße 161-163, 13509. Job pages are usually under `/ueber-uns/stellenangebote...` (City West: `https://www.berlin.de/musikschule-charlottenburg-wilmersdorf/ueber-uns/stellenangebote-job-offers/`, with the entry "als Honorarkraft: momentan leider keine Angebote").

## Search patterns by category

For each category: portals, queries in German and English, and what to look for. The full keyword lists are in `data/categories.json` (`keywords_de`, `keywords_en`); this is the search version.

### MUN, municipal Musikschule
- Portals: Karriereportal Berlin, the school's "Stellenangebote" pages, praktischkommune.de, Jooble.
- German queries: `Musikschullehrkraft Viola`, `Musikschullehrkraft Violine Ensembleleitung`, `Musikschullehrkraft Streichinstrumente`, `Honorarkraft Musikschule <Bezirk>`, `Interessenbekundung Musikschule`.
- English queries: `viola teacher Musikschule <Bezirk>`, `district music school Berlin job`.
- Signals: the instrument list names the instrument, "auf Honorarbasis" or Teilzeit, ad open to external applicants, requirement "abgeschlossenes Musikstudium" or "berufsfachliche Ausbildung".
- Watch out: "Interessenbekundungsverfahren" restricted to the school's own Honorarkräfte; 2026 deadlines already passed according to search summaries of the ads (Lichtenberg 5.6 and 17.7.2026, Friedrichshain-Kreuzberg 2.6.2026, Mitte 5.5.2026, Treptow-Köpenick 28.6.2026); the Lichtenberg ad of 17.7.2026 already returns HTTP 410.
- Contracts: use `employment` only with TV-L/TVöD in the ad; "Honorarbasis" or "Honorarordnung des Landes Berlin" is `honorar_hourly`.

### PRV, private school
- Portals: the school's website, Indeed/Jooble via web search, Kleinanzeigen.
- German queries: `Instrumentallehrer gesucht Berlin Geige`, `Musikschule Berlin Lehrer gesucht Violine Honorar`, `Musikschule Berlin Bewerbung Lehrkräfte`.
- English queries: `private music school Berlin violin teacher wanted`.
- Signals: a "Lehrer gesucht" page, fee per lesson, lessons in the teacher's own rooms, schools with many freelance teachers (for example WunderMusikSchule, about 40).
- Watch out: no commission or room-rent figures are published; do not assume them. If the website does not say, use `contract.type: honorar_hourly` with `is_guess: true` only if it says "Honorar".

### PNO, piano school
- Portals: the school's website, Google Maps via web search, Kleinanzeigen.
- German queries: `Klavierschule Berlin`, `Klavierunterricht Berlin Lehrer gesucht`, `Klavierlehrer Honorar Berlin`.
- English queries: `piano school Berlin`, `piano teacher wanted Berlin`.
- Status: not yet probed.

### WND, wind band or wind school
- Portals: the band's or school's website, Landesmusikrat, the district Musikschule.
- German queries: `Blasorchester Berlin Dirigent gesucht`, `Bläserklasse Berlin`, `Blasmusik Jugendausbildung Berlin`, `Musikverein Berlin Ausbilder`.
- English queries: `wind band Berlin conductor wanted`, `brass band Berlin youth`.
- Status: not yet probed.

### CHO, choir or vocal institution
- Portals: the choir's website, nmz Stellenmarkt (category "Chorleitung"), Landesmusikrat.
- German queries: `Chorleiter gesucht Berlin`, `Kinderchor Berlin Stimmbildung`, `Gesangslehrer Honorar Berlin`, `Chorleitung Honorar Berlin`.
- English queries: `choir director wanted Berlin`, `voice teacher Berlin`.
- Status: not yet probed.

### EDU, schools, all-day care, Kitas, international schools
- Portals: Karriereportal Berlin (SESB, public schools), Recruitee/TES/ZipRecruiter for international schools, the "Careers" page of each school.
- German queries: `Musiklehrkraft freiberuflich Kita Berlin`, `Staatliche Europa-Schule Lehrkraft native speaker`, `Streicherklasse Grundschule Berlin`, `Ganztag Musik AG Honorar`.
- English queries: `international school Berlin music teacher`, `freelance music teacher early childhood Berlin`.
- Watch out: Quereinstieg for music requires a Master's degree and a permanent contract with parallel study (2019 data, see `data/reference/fees.md`); public-school posts ask for a state teaching qualification (Lehramt). School offers inside a Musikschule are paid at Honorarsatz 3.

### HOC, conservatories, universities and preparatory training
- Portals: https://www.hfm-berlin.de/hochschule/stellenausschreibungen/kuenstlerische/ (professorships only on 2026-10-15), UdK job listings, nmz Stellenmarkt.
- German queries: `Lehrauftrag Viola`, `Lehrauftrag Kammermusik Berlin`, `Lehrbeauftragte Streicher UdK`, `studienvorbereitende Ausbildung Streicher`.
- Watch out: teaching assignments (Lehraufträge) are almost never advertised; count as `none_found` with a note that they are requested from the department.

### ENS, amateur and youth orchestras and ensembles
- Portals: each orchestra's website, Landesmusikrat, the district Musikschule.
- German queries: `Registerprobe Streicher Dozent`, `Orchesterleitung gesucht Berlin`, `Landesjugendorchester Berlin Dozenten`.
- Watch out: pay can be symbolic; record "no data" unless the ad states it.

### OUT, music outreach and education programmes
- Portals: HR notices of the Barenboim-Said Akademie, Education of the Berliner Philharmoniker (https://www.berliner-philharmoniker.de/education/), Konzerthaus, Staatsoper, Deutsche Oper, Landesmusikrat.
- German queries: `Musikvermittlung Berlin Honorarkraft`, `musikalische Mentor:innen`, `Workshopleitung Musik Grundschule`, `Education Orchester Berlin Honorar`.
- Example with conditions: `Musik spricht`, Honorarvertrag, 40 EUR per 60 min, about 10 hours a month, deadline 23.8.2026 (expired).
