# Reinickendorf notes (2026-10-27)

## Searches done
- berlin.de/musikschule-reinickendorf (lehrangebote, ensembles PDF), Senatskultur address list, miz.org school list (music-profile Oberstufe schools), Das Örtliche (Musikschule/Klavier lists, almost empty for the district), 8 WebSearch calls (private schools, choirs, wind bands, schools, accordion): no further verifiable entities.

## Removed
- reinickendorf-ecole-de-musique-de-berlin: already in data/exclusions.json (not verifiable); its Wix site gives no readable text, so no instruments could be confirmed. A berlin.de press release (2025/pressemitteilung.1570271) confirms the school exists with four locations, but no address or instruments. the maintainer may want to re-add it manually.

## Doubts
- Senioren-Orchester: the source does not name instruments; strings/woodwind/brass is inferred from "orchestra". The e-mail is the district senior office (Fachbereich Senioren).
- Bettina-von-Arnim-Schule: instruments not listed (lessons via Musikschule Reinickendorf), so the instrument families are a broad assumption. Its e-mail comes from miz.org, not the school's own page.
- MUN sites: Frohnau (Fuchssteinerweg 15) and Atrium (Senftenberger Ring 97) come from the 2024/25 string-ensemble PDF; Tegel Grünes Haus and Hermsdorf Gustav-Dreyer-Grundschule have no street found.

## Failed sources
- ecole-de-musique.de (HTTP 400 / JS only), Das Örtliche lists (no website data), general web search finds few private schools, choirs or wind bands in this district.

## Outside district
- none found.

## Second pass (2026-10-27)

### Added
- reinickendorf-absolutely-unterhaltsam (CHO): a cappella choir e.V., Egidystrasse 6, 13509; address and kontakt@ mailbox from its Impressum.
- reinickendorf-achorpella (CHO): choir IG in Hermsdorf; the only address is the Impressum address (Solquellstrasse 45, 13467), which may be a private address. The only email on the site is a free-mail address (gmail), so it was NOT recorded.

### Searches done
- 15 WebSearch calls (Posaunenchor, Kantorei, Blasorchester, Klavierschule, PRV by postcode, Evangelische Schule Frohnau, Chorverband, school music profiles): almost all returned other districts.
- WebFetch: Das Oertliche choir list (no Reinickendorf entries), Gelbe Seiten (Musikschule, Klavierunterricht, Chor), miz.org Berlin music schools (only Music Institute Berlin and Musikschule Reinickendorf), zlb.de link list "Mitmachen und lernen" (page 1 of 16 only; pagination parameters did not work), berlin.de press releases 2025 (1629606, 1603318), visitBerlin event page.
- curl had no outbound connectivity in this session (HTTP 000 for most hosts); WebFetch was used instead.

### Leads not added (no verifiable official page or address)
- Private Musikschule Erik Enseleit, Roedernstr. 13, 13467 (Gelbe Seiten only; no website found; name contains a personal name).
- Bläserensemble des Kirchenkreises Reinickendorf (church-district brass ensemble, plays at the Rathaus New Year's Eve event): no website or address of its own.
- Blasorchester "Die Hornetz": named in a berlin.de press release; location and website unknown.
- Evangelische Schule Frohnau (EDU candidate, Schulstiftung EKBO): site not reachable (ENOTFOUND on guessed domains); music programme unverified.
- Kirchengemeinden of the Kirchenkreis Reinickendorf (Kantoreien, Posaunenchoere): site not found; kirchenmusikerverband-ekbo.de has a 2020 PDF for Segen parish (not checked, outdated).
- "Young Symphonics Reinickendorf", Junior Big Band, Kinder- und Jugendchor: belong to Musikschule Reinickendorf (already MUN), not separate entities.

### Failed sources
- ecole-de-musique.de again not used (excluded); kirche-reinickendorf.de (ECONNRESET), schulstiftung.info (ECONNRESET), duckduckgo/bing via WebFetch (useless), bildung.berlin.de Schuldatenbank (404), berlin.de Schulamt schools page (404).
- Lise-Meitner-Gymnasium at lise-meitner-gymnasium.de is in Falkensee, not Reinickendorf.

### Coverage gap
- PNO and WND still have zero entries in the district; no dedicated piano school or wind band with an address and official site could be verified.

## Third pass (2026-10-29)

### Added (8)
- CHO: Shanty-Chor Reinickendorf (Chorverband JSON + own site; rehearsal address from site; no email published, phone on site is probably a personal mobile so not recorded), Gospelchor Family & Friends (Chorverband JSON + own site; the only email is an AOL group address, NOT recorded; phone is the office line; address is the rehearsal hall Räuschstr. 18-20 from the Chorverband JSON, the Impressum address Miraustr. 134 may be private), Deutsch-Französischer Chor Berlin (rehearsal hall address, role mailbox from its Proben & Kontakt page; postal address of the association is in Lichterfelde), Kirchenmusik Tegel-Borsigwalde (Kantorei Alt-Tegel and brass ensemble Tegel+).
- WND (first entries in this district): Posaunenchor Alt-Wittenau, Bläserchor Waidmannslust, Joy of Brass (Stadtmission Tegel), Bläserchor und Junges Blech Frohnau. Found via posaunendienst-ekbo.de/posaunenchoere/kirchenkreis-reinickendorf.
- Chorverband JSON: 360 choirs; 4 in Reinickendorf; Absolutely Unterhaltsam was already present.

### Doubts
- Frohnau: address is the youth house (Fuchssteinerweg 20-26) where the youth brass lessons happen; the Bläserchor rehearses in the "Gemeindesaal" (no street on the page). No generic email found.
- Joy of Brass email is the Berliner Stadtmission general address, not Tegel-specific.
- Tegel-Borsigwalde: street addresses of the Gemeindezentren are not on the music page; parish office address Alt-Tegel 39 used.

### Not added
- Posaunenchor Apostel Johannes (apojo.de page 404), Posaunenchor Matthias Claudius (kto-mcg.de is a parked domain), Junges Blech Heiligensee (404). Other parish Kantoreien: no pages reached.
- Evangelische Schule Frohnau: domain still does not resolve. No other school with verifiable instrumental teaching found.

### Searches
- 3 WebSearch calls (Posaunenchor, Kantorei Reinickendorf, posaunendienst search); fetches of chorverband JSON, choir sites, parish sites. Failed: ekg-frohnau and noomi pages gave ECONNRESET once (retried OK), evangelisch-in-reinickendorf.de ECONNRESET, tegel-borsigwalde.de/impressum ECONNRESET.
