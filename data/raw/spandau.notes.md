# Spandau scout notes (2026-10-27)

## Removed
- spandau-swiss-international-school-berlin: the school site mentions no music, instrument or orchestra teaching, and web search found nothing. Add back only if a music programme turns up.

## Searches done
About 10 web searches (municipal, private, piano, guitar/accordion, wind band, choir, church music, Gymnasien, amateur orchestras) plus fetches of each entity's site.

## Outside district
- Musikschule Philharmonika, main office: Paulsborner Straße 78, 10709 Berlin (Charlottenburg-Wilmersdorf), https://www.klavierunterricht-berlin.net/klavierlehrer/de/home.php. Its Spandau site (Buchenweg 17, 13587) is entered here with the main office in `sites`; the CW scout may have the main entity (possible duplicate for the merge).

## Doubts
- Chorvereinigung Spandau: the Impressum page could not be loaded (TLS or redirect errors); address is the rehearsal place (Lily-Braun-Gymnasium, Münsingerstraße 2). No general email found (karten@ is only for tickets).
- Spandauer Blasorchester 1960 e.V.: the official address is a PO box (14004 Berlin); the entity uses the rehearsal hall (Jaczostraße 53/65). mitglieder@sbo60.de is the membership role mailbox on the Probenzeiten page.
- Kant-Gymnasium and Lily-Braun-Gymnasium: instruments are inferred from the cooperation with the Musikschule Spandau and from the school profile pages; no school email found (websites unreachable or without one). Kant-Gymnasium may move (sources report a plan to relocate).
- PSF Musikschule: site returned 403 to WebFetch and curl; instruments taken from the earlier annotation (piano, guitar).
- Philharmonika job ad has no date; piano only.
- Jugendblasorchester Spandau, Spandauer Stadtmusikanten and the other ensembles belong to the Musikschule Spandau, so they are not separate entities.
- Not found: dedicated private piano, guitar or accordion school in Spandau, Posaunenchor, independent amateur orchestra, church choirs with their own site. Spandau schools with string or wind classes beyond the two Gymnasien were not found.

## Failed sources
chorvereinigung-spandau.de (Impressum, Kontakt), psf-musikschule.de (403), kant-gymnasium-berlin.de, lily-braun-gymnasium.de/kontakt (no content).

## Second pass (2026-10-27)

Added 6 entities beyond the first pass: Kantorei St. Nikolai (CHO), Vormittagschor St. Nikolai (CHO), Turmbläser St. Nikolai (WND), Ev. Weinbergkirchengemeinde choirs (CHO), Paul-Moor-Grundschule, Christian-Morgenstern-Grundschule and Grundschule an der Pulvermühle (EDU; 7 in total). Nothing removed. Validation passes (16 entities).

Searches: about 14 WebSearch calls (Posaunenchor, Kantorei, piano schools, choirs by Ortsteil, amateur orchestras, guitar/accordion/voice schools, school Bläser/Streicher classes, Popchor, Spielmannszug/Kammerchor, postcode search). Fetched: miz.org search (not filterable by district), Das Örtliche and Gelbe Seiten (only Bravissimo, Musikschule Spandau, PSF and Philharmonika listed, all already present), nikolai-spandau.de, weinberggemeinde.de, school pages of the Bezirksamt directory.

Doubts and not added:
- Popchor Spandau (popchor-spandau.de, Wix site): about 80 singers, belongs to the Kirchenkreis Spandau, but no street address or Impressum could be read, so it is not added. Check later.
- Cantores Minores (children's early-music choir): performs at St. Nikolai but no Spandau address or own Impressum found.
- Weinbergkirchengemeinde: Impressum gives Heerstraße 367, 13595; the job ad gives 13593. No institutional email on the Impressum (info@weinberggemeinde.de appears only in an EKBO PDF), so none recorded. Its C-Kantorenstelle (50 %, TV of the EKBO) had a deadline of 15 Oct 2026, so status is none_found. Rehearsals are at the Gnadenkirche, Jaczostr. 52.
- Kantorei/Vormittagschor/Turmbläser St. Nikolai share the parish address (Reformationsplatz 6) and the parish office email from the Impressum; the three pages were reachable only via curl (WebFetch gave ECONNRESET).
- Grundschule an der Pulvermühle: the string group is documented only in a Bezirksamt press release (2024) and the school's own site was not fetched (the Bezirksamt school page lists no string offer). No school email found.
- Paul-Moor-Grundschule: the /blaeserklassen page was not read; the instruments of the wind classes are not stated.
- Christian-Morgenstern-Grundschule: the school site was thin; percussion and choir come from the Bezirksamt school page.
- Not found despite searching: dedicated private PNO, WND schools, Posaunenchor, independent amateur orchestra, further private music schools in Spandau (Das Örtliche and Gelbe Seiten list only the known ones). Other Spandau Grundschulen may have music programmes (not checked one by one).
- Failed: kirchenkreis-spandau.de (TLS certificate mismatch), popchor-spandau.de content, weinberggemeinde.de/impressum (404).

## Third pass (2026-10-29)

Added 3 CHO entities: Pro Musica Chor Berlin e.V., Popchor Spandau, Magic of Gospel e.V. Nothing removed. Source for the candidates: Chorverband Berlin JSON (cct_bezirk = Spandau: 8 choirs). Searches: 2 WebSearch (Posaunenchor, Kirchenmusik by Ortsteil; nothing usable for Spandau).

Doubts and not added:
- Chorverband Spandau choirs not added: Kammerchor Cantiamo (site is an old frameset with no address, contact or Impressum; the only email in the JSON is a personal one), Cappella Vocale Berlin (no website; personal email), Frauenchor Spandau 1956 (Facebook page only; personal email), Klingende Brücke Liedstudio (its site now gives rehearsals in Charlottenburg, Trinitatis-Kirche, Leibnizstraße 79, and Mariendorf; outside Spandau).
- Pro Musica Chor: address is the rehearsal place (Schule an der Haveldüne, Jaczostr. 53-67); the Impressum gives only the email pmcb@gmx.de (association mailbox, not a person's name). No ad.
- Popchor Spandau: address is the rehearsal place (Petruskirche); the email is stated on the site (text taken from the home page); the Impressum content could not be read.
- Magic of Gospel: address is the Kladow parish address from the Chorverband JSON; the site says rehearsals are in the Dorfkirche Kladow (Friday), so the exact street may differ. Email chor@ is on the Impressum/contact pages.
- Chorvereinigung Spandau already present. Cantores Minores still has no Spandau address of its own.
- No Posaunenchor or parish Kantorei with an own site found beyond St. Nikolai and Weinberg (already present). Schools "not added": none verifiable beyond the existing ones; Grundschule an der Pulvermühle is in exclusions.
- Failed: WebFetch of promusicachorberlin.de (SSL handshake; curl worked), kammerchor-cantiamo.de frames had no contact data.
