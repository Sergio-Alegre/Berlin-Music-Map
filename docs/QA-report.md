# QA report

- Reviewed: `data/jobs.json` (168 entities) and `dist/berlin-music-map.html` (917 KB, built 2026-10-28 00:05, data date 2026-10-27).
- Review date: 2026-10-28. Reviewer: independent (`qa-reviewer`); `dist/`, `src/` and `data/jobs.json` were not modified.
- Checklist: `docs/QA.md`. Browser: headless Microsoft Edge (Chromium) driven by `puppeteer-core` installed in a temporary directory, at 1280x800 and 380x800, opened from `file://`.
- Result: **4 defects, 17 improvements, 8 manual tests.** Defect 1 needs an owner decision; the others are small data fixes. No script error, no layout or filter defect.

## Not run

- `node scripts/test_mail.js`: **not run**. `mailparser` is not installed. As a substitute I built mailto links and `.eml` files in the browser and parsed the `.eml` files with Python's `email` module (see "Mail checks" below). This does not replace the script or a real mail client.

## Checklist result

| # | Item | Result |
| --- | --- | --- |
| D1 | 100 % validate against the schema | Pass. `py scripts/validate.py data/jobs.json --require-geo`: 168 entities, 0 errors, 0 warnings. |
| D2 | No point outside Berlin or its district; approximate points dashed | Pass, with a note. All 168 points fall inside their district (own point-in-polygon check), 71 branch points are inside Berlin. 155 points are `address`, 13 are `street`, none is `postcode`, so nothing is drawn dashed (see improvement 3). |
| D3 | The 12 municipal schools, with branches | Pass for the 12 schools and 39 mapped branches. Four branches have no coordinates (defect 4 and improvement 2). |
| D4 | At least one instrument family; filters plausible | Mostly pass: no entity lacks a family, and category-implied families hold (CHO has voice, PNO keyboard, WND wind or brass). **Fail for one entity** (defect 3). |
| D5 | Open ads checked in the last 48 h, not expired | Pass. The three `posted` ads were checked on 2026-10-27 (about 24 h before this review) and their pages were live on 2026-10-28 with the ad text. They must be rechecked by 2026-10-29. The Moa ad is dated "06'26" (improvement 4). |
| D6 | Every email appears on its source page or is flagged `email_obfuscated` | **Fail** (defect 2). Of 141 emails, 138 were found on the source page or are flagged obfuscated; 3 could not be confirmed. |
| D7 | No names of people, no private emails | **Fail** (defect 1). No personal names in any text field (regex scan of summary, conditions, evidence, titles). |
| D8 | Counts agree between `jobs.json`, the HTML and the legend | Pass. Embedded data: 168 entities, identical to `jobs.json` except for the dropped `found_by` field. Legend and Layers counts per category: MUN 12, PRV 54, PNO 4, WND 11, EDU 21, HOC 3, ENS 9, OUT 9, CHO 45 (123 in "Teaching · Music"). Counter "168 of 168". Meta and legend say 2026-10-27. |
| M1 | Every layer and category switches; "only this", "Show all categories"; legend matches `categories.json` | Pass at both widths. All 9 categories: "only" gives the exact set and satellite count; each switch on and off; both layers; Show all and Hide all; U-Bahn, S-Bahn, tram, bus, district boundaries and both base maps switch. Legend names, colours and counts equal `categories.json`. |
| M2 | Instrument filters alone and combined | Pass at both widths. 8 families alone (82/74/78/65/67/20/126/61), each combined with CHO, PRV, MUN and with Mitte, Pankow, Spandau (all equal to my own computation from `jobs.json`); two families combined (union); text search with umlaut, ß and accent folding (Jüttner/juettner/juttner, Köpenick/koepenick/kopenick, Béla/bela, Weißensee/weissensee, Ayabás/ayabas); municipal only (12); offer chips (3 and 27). |
| M3 | Every marker on its coordinate after zooming | Pass. `scripts/smoke_map.js` passes at both widths. Independently, the visual pin tip is within 0.2 px of the coordinate for all 168 pins and 71 satellites at zoom 9, 10, 11, 14, 16, 17, 18; all markers are `position: absolute`. Pins that share a coordinate are offset by design (improvement 13). |
| M4 | Five random popups correct | Pass. Checked: Deutsch-Türkische Musikakademie, Kammerchor Memoria, Joseph-Schmidt-Musikschule, Chöre der Martin-Luther-Kirchengemeinde, Musikinstrumenten-Museum, tuCanto, Klavierschule Berenstein (posted ad), Ayabás (no email), a branch popup. Name, category, district, station, email, phone and instrument families match the data. |
| M5 | Mail link keeps ä, ö, ü, ß, é, ñ; greeting names the entity, right language | Pass for 5 entities (4 random with special characters plus the only Spanish one), and by a scan of all 168 entities x 4 languages x 2 variants. No encoding damage, no unresolved placeholder, no link over the 2000-character limit. Grammar of some German greetings is wrong (improvement 5). |
| M6 | `.eml` opens with the PDF in Thunderbird and sends with "Edit as New" | **Manual test 1.** The file itself is structurally valid (see below). |
| M7 | Settings survive reload; export and import | Pass at both widths: name, email and CV file (IndexedDB) and the filter state survive a reload; export, clear, import restores the exact settings; an invalid file is rejected with a message and leaves the settings unchanged. |
| M8 | No personal data in the HTML; no console errors; below 5 MB; works from disk | Pass. 0.92 MB; no console error or page error at 1280 and 380 px; no developer name, path or personal email in the HTML. Four free-mail addresses are in the data (defect 1 and improvement 8). No horizontal scroll at 380 px with any panel or popup open. The only failed requests are aborted tile requests when switching the base map. |
| M9 | All interface text is correct, natural English | Pass with small points (improvements 9 and 10). I read the legend, filter, layer, settings, dialog, toast and popup text. |

## Defects

### 1. A person's name and a free-mail address in the data (checklist D7, `CLAUDE.md` rule)

- **Where:** `data/jobs.json` line 2052 (`friedrichshain-kreuzberg-musikzimmer-marcelo-berrini`), source `data/raw/friedrichshain-kreuzberg.json` line 78. Name: "Musikzimmer Marcelo Berrini (Musikschule)"; email `musikzimmer@gmail.com`.
- **Steps:** `grep -n Berrini data/jobs.json`; open the pin in Friedrichshain-Kreuzberg (the name shows in the popup and in the greeting of every email: "Sehr geehrtes Team von Musikzimmer Marcelo Berrini").
- **Why it fails:** it is the studio of one individual, named after him, with a Gmail address. `CLAUDE.md` and `docs/DATA-MODEL.md` forbid names of people, individual teachers and private emails. The same policy excluded Musikschule Kolesnikov and aCHORpella (`data/exclusions.json`). `docs/STATUS.md` records a decision to keep the Gmail address because it is on the imprint; that decision does not cover the person's name and conflicts with the rule.
- **Fix options:** exclude the entity (consistent with Kolesnikov), or rename it to the school's brand name without the person's name and get the owner's explicit sign-off for the Gmail address.

### 2. Email not on its source page: Die Schottenkinder e.V. (checklist D6)

- **Where:** `data/jobs.json` line 8516 onwards (`steglitz-zehlendorf-schottenkinder`); email `Vorstand@Schottenkinder.de`, `email_source_url` `https://www.schottenkinder.de/impressum`.
- **Steps:** open the URL on 2026-10-28: it shows "Die Schottenkinder eV is under maintenance" and contains no email; the entity is not flagged `email_obfuscated`.
- **Why it fails:** "Every email appears on its source page (or is flagged)". `docs/STATUS.md` knows the site is in maintenance mode and keeps the entry from 2026-10-15. Either find another official page that shows the address, or drop the email (the entity can stay with its website and phone), or set the entry aside until the site is back.
- Two more emails could not be confirmed and are in manual test 5: `kontakt@epiphanien.de` and `gemeinde@hoffnungskirche-pankow.de` (for the second, the address is on the home page but not on the page named in `email_source_url`).

### 3. Instrument families that the source does not support: Bettina-von-Arnim-Schule (checklist D4)

- **Where:** `data/jobs.json` (`reinickendorf-bettina-von-arnim-schule`): `instruments` has 7 families (strings, woodwind, brass, keyboard, guitar_plucked, percussion, voice), but `instruments_detail` says "instrumental lessons in cooperation with Musikschule Reinickendorf (instruments not listed)" and "choir".
- **Steps:** Filters, Instrument family, Percussion (or Brass, Woodwind, Guitar): the school shows up in each of them.
- **Why it fails:** the filter returns a school for six families that no source names. Comparable entities were handled conservatively (Campus Rütli has only strings, Droste-Hülshoff only voice). Reduce to `voice` (the choir), or to what the source states.

### 4. Typo in a branch name, visible in a popup (checklist M9)

- **Where:** `data/raw/marzahn-hellersdorf.json` line 14, `data/jobs.json` line 2909: "Haus Babylon (Standort- y Fachgruppenleitung Streichinstrumente)". The "y" is Spanish; it should read "Standort- und Fachgruppenleitung" (or simply drop the parenthesis).
- **Steps:** open the Hans-Werner-Henze-Musikschule popup, "Branches" list; or `grep -n "Standort- y" data/jobs.json`.
- Low severity, but it is user-facing text and a one-line fix (change `data/raw/`, then re-run `merge.py` and `build_map.py`).

## Improvements

Ordered by value.

1. **`docs/STATUS.md` numbers are stale.** The snapshot says 2 open ads, 20 places invite applications, 18 without email, 67 branches with coordinates. The data has 3 open ads, 24 invites, 27 without email and 71 branches with coordinates (76 branches in total). It also says "Last updated 2026-10-27" although the data was rebuilt at 00:05 on 2026-10-28.
2. **Five branches have no coordinates and are not on the map:** Kunsthaus Flora and MS Maratstraße (Hans-Werner-Henze-Musikschule), Musikschule Marzahn and Musikschule Hellersdorf (Musikschule "Fame"), and "Unterrichtsorte: Borsigwalde, Frohnau, …" (Musikschule Reinickendorf), which is a list of districts rather than a place and belongs in `conditions` or `summary_en`. `validate.py --require-geo` does not warn about branches without `geo`; add a warning.
3. **`street`-precision points (13) are drawn solid.** `docs/MAP.md` and the legend call only `postcode` approximate, so nothing is dashed today, but a street-level hit can be 100 m off. Either draw `street` as dashed too, or reword checklist D2 in `docs/QA.md` so that it names the precision values.
4. **Moa Musikschule ad is dated "06'26"** ("Wir suchen ab sofort (06'26)", June 2026). The page is live, but the ad is about four months old. Show a posting date in the popup when the page gives one, and recheck with the school.
5. **German greeting grammar.** The greeting is built as "Sehr geehrtes Team von <name>". It reads wrongly for "… Team von Die Schottenkinder e.V.", "… Team von Chöre der Ev. Kirchengemeinde Kreuzberg", "… Team von Chöre der Martin-Luther-Kirchengemeinde Pankow", and clumsily for "… Team von Ev. Kirchengemeinde Friedrichshagen: Kirchenmusik". Add an optional `greeting_name` field to the schema, or use the neutral "Sehr geehrte Damen und Herren" when the name starts with an article or a plural noun.
6. **`email_language`** is `de` for English-speaking institutions such as the John F. Kennedy School (`welcome@jfksberlin.org`) and Berlin Music School (Zehlendorf). Check each and set `en` where the site is English. Only 4 of 168 entities have a language other than German.
7. **"Email + CV (.eml)" for a place without email** (27 places) produces a draft without a `To:` header, while "Email" is correctly disabled. Add a hint in the toast or disable the button. At 380 px the toast ("Draft downloaded …") also covers the popup's action buttons for a few seconds.
8. **Free-mail addresses and mobile numbers.** Six emails are on free providers (gmail.com: Musikzimmer, KlangSinn, PSF Musikschule, Musikschule Lichterfelde Zehlendorf; web.de: Akazien-Grazien; t-online.de: Posaunenchor Hellersdorf), and seven phone numbers are mobile (VivaMusica, Musikcoach Berlin, tuCanto, Lisbeth und Franz, Berlin Music School, Schottenkinder, B&B Musikschule). Most are on the entity's own imprint, but ask the owner to confirm each one is a business contact and not a private one.
9. **"No ad found · you can still apply"** (shown for all 141 `none_found` places) overstates the data: no ad was found, which does not mean the place takes applications. Suggested copy: "No ad found. You can send an unsolicited application."
10. **Small copy points in the data:** `summary_en` of the Bettina-von-Arnim-Schule says "Maerkisches Viertel" (the branch names use "Märkisches Viertel"); the branch "Sede central Schöneberg" (All Is One!) is Spanish in an English interface; `email_obfuscated: true` on `lichtenberg-kantorei-karlshorst` has no `email` to attach to; `email_obfuscated` is in `data/schema.json` but not in `docs/DATA-MODEL.md`.
11. **Other family assignments are generous** where the detail text says the instruments are not itemised: Händel-Gymnasium and Senioren-Orchester (strings, woodwind, brass from "orchestra"), Landesmusikakademie (five families from "courses"), Moa Musikschule (keyboard and voice are not in its detail list). Reasonable inferences, but mark them (for example a `families_inferred` note) or narrow them.
12. **Two branch markers sit exactly under the main pin and cannot be seen:** Geschäftsstelle Bethanien (Musikschule Friedrichshain-Kreuzberg) and Haus der Bildung (Musikschule Paul Hindemith). Drop these two entries or move the main pin.
13. **Pins with the same coordinate (13 groups) stay 36 px apart at every zoom**, even at zoom 18, where the true spacing would be zero. This is by design (`docs/MAP.md`) and the marker-position test accounts for it, but a spiderfy that opens on click would keep the true position visible.
14. **`scripts/smoke_map.js` position test is partly circular.** It compares the icon rectangle with the anchor arithmetic. It would still pass if the pin graphic itself were drawn at the wrong offset. Add the check I used: bottom centre of the `.pin` bounding box against `latLngToContainerPoint`.
15. **`docs/QA.md` does not say where the report goes**, and `scripts/test_mail.js` needs `mailparser`, which is not in `scripts/package.json`. Add the report path and a `devDependencies` entry (or a one-line install note in `docs/QA.md`).
16. **Layout at 1280x800:** the Legend and Layers panels both open by default and repeat the same category list; together they cover about 45 % of the map. Open only Layers by default, or merge the category list into one panel.
17. **Source URL for an email should be the page that shows it.** `pankow-blaeserchor-hoffnungskirche` points to `/page/135/blaeserchor`, which shows no address (the address is on the home page).

## Manual tests

1. **Thunderbird and the `.eml` (checklist M6).** Prerequisite: Thunderbird 115 or later with an account set up. (a) In the map, open Settings, enter name and email, and choose any PDF as "CV file". (b) Open the popup of "Musikschule Béla Bartók Berlin-Pankow" and click "Email + CV (.eml)". (c) Open the downloaded `email-pankow-musikschule-bela-bartok.eml` in Thunderbird. Expect it to open as a received message (X-Unsent header) with the PDF as an attachment; subject and body show "Béla", "Bartók" and "Weißensee"-style characters correctly. (d) Choose Message, "Edit as New". Expect a compose window with To, Subject, body and the PDF attached. (e) Send to your own address. Expect the received mail to have the attachment with a correct file name and the same characters in subject and body. (f) Repeat with a CV file name containing ä or ñ (the `.eml` carries both an ASCII `filename` and an RFC 2231 `filename*`).
2. **`mailto:` on Windows.** With Outlook (new and classic), Windows Mail and, separately, a web handler such as Gmail registered for `mailto:`: click "Email" on a place whose name has ä/ö/ü (for example "Berliner Mädchenchor"), then on a place with ß ("Posaunenchor der Kirchengemeinde Weißensee"). Expect subject and body with the right characters and line breaks, and the recipient filled in. Also open one German, one English and the Spanish place (tuCanto) and read the text aloud for tone.
3. **Phone at 380 px.** On a real phone (iOS Safari and Android Chrome), open the file from the device or a web host: pinch-zoom, tap a pin, scroll a long popup (Hans-Werner-Henze-Musikschule), open each of the four panels, rotate the phone, and tap "Email". Expect no horizontal scroll, tap targets large enough, the popup not hidden behind the top bar, and the mail app opening.
4. **Transit colours.** Compare the line colours in the map (U1 to U9, S1 to S85) with the current BVG/S-Bahn network map; the tram and bus layers should be thinner than the rail lines.
5. **Unconfirmed emails.** Open each source page in a normal browser and look for the address: `kontakt@epiphanien.de` (`https://www.epiphanien.de/impressum`; the HTML has no address, so it may be loaded by script), `gemeinde@hoffnungskirche-pankow.de` (`https://www.hoffnungskirche-pankow.de/page/135/blaeserchor`), and `Vorstand@Schottenkinder.de` (defect 2). Also check the two flagged as obfuscated whose page showed no readable address to my fetch: Händel-Gymnasium (`sekretariat@haendelgym.de`) and Musikinstrumenten-Museum (`kontakt@sim.spk-berlin.de`). The Spandau Kant-Gymnasium site (`https://www.kant-gymnasium-berlin.de/`) timed out from my network on every attempt; open it and confirm it exists.
6. **Open ads, repeat within 48 h of release.** Open the three ad pages and confirm each is still there and not expired: Klavierschule Berenstein (`https://klavierschule-berenstein.com/jobs`), moamusikschule (`http://www.moamusikschule.de/stellenangebote/`, see improvement 4), Philharmonika Spandau (`https://www.klavierunterricht-berlin.net/klavierlehrer/de/jobs.php`). Then update `offer.checked` and `last_verified`.
7. **Language review.** Ask native speakers to read the Spanish and Italian default templates (`src/mail.js`) and the English interface text; a native German speaker should read the German templates and the role phrases (for example "Registerproben und Ensemblearbeit").
8. **Other browsers and keyboard use.** I tested Chromium only. Open the file in Firefox and Safari from disk: settings and the CV file survive a reload (IndexedDB on `file://` behaves differently), the `.eml` downloads, and in a private window the map still works with the "kept in memory" CV message. Then use the map with the keyboard only (Tab through the top bar, panels, a pin and the popup buttons) and with a screen reader on one popup.

## What was run

- `py scripts/validate.py data/jobs.json --require-geo`; `node scripts/smoke_map.js` (both widths, all checks passed).
- Own scripts in the session scratchpad (not in the project): data counts and point-in-polygon check; HTML-embedded data against `jobs.json`; 141 email source pages fetched read-only (a plain GET of each `email_source_url`, no forms, no contact with any entity), with a second attempt by `curl` for the failures; 168 websites fetched (16 answered 403 or timed out for my fetcher; `berlin.de` and the others answer 200 to `curl` except `kant-gymnasium-berlin.de` and `evkgk.de/musikalische-angebote`, which timed out twice); three ad pages fetched.
- Browser: about 250 checks per width on layers, categories, families, combinations and search; transit and boundary toggles; pin geometry at 7 zoom levels; popups; mailto and `.eml` for 5 entities at each width; settings persistence, export, import and invalid import; screenshots at 380 and 1280 px.
