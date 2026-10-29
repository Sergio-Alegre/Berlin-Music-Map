# Marzahn-Hellersdorf notes (2026-10-27)

## Searches done
Musikschule/private schools, choirs/wind bands/youth orchestras, Gymnasien with music profile, piano/guitar/accordion studios, music-profile schools, Jugendkunstschule.

## Changes
- Henze-Musikschule: instruments annotated, email musikschule@ba-mh.berlin.de (contact page).
- Fame / VivaMusica: person names removed from entity names; VivaMusica gmail address removed (private-style free mail).
- Added: Marzahner Kammerchor (CHO), Johann-Strauss-Grundschule (EDU).

## Not added
- Frauenzimmerchor Marzahn (frauenzimmerchor.com): no Impressum or address, only rehearsal church Schleusinger Str. 12, 12687.
- Berliner A-Cappella-Chor (b-a-c-c.de): site certificate expired, not verifiable.
- Jugendkunstschule derArt, Kummerower Ring 44: only an old newspaper source (piano, e-guitar, e-bass, drums, pop voice); no official page checked.
- Jugendsinfonieorchester MH: belongs to the Henze-Musikschule (not separate).
- Klavier-/Geigenunterricht Mahlsdorf: individual teacher.

## Doubts
- Johann-Strauss-Grundschule: instrument offer unconfirmed (Kooperationen page not read); keep or drop.
- Gymnasia (Sartre, Wilhelm-von-Siemens, Melanchthon): music profile not checked; miz.org Berlin list not loaded.
- No wind bands found; no Overpass used.

## Outside district
None.

## Second pass (2026-10-27)

### Searches and sources
- Das Örtliche (Musikschule pages for Marzahn, Hellersdorf, Mahlsdorf, Kaulsdorf; Chor Marzahn): only individual teachers or listings without a website; one lead (Musikschule Schumann, Cecilienplatz 8) has no web page, not added.
- 7 WebSearch calls (church music, Gymnasien, Grundschulen, Jugendkunstschule, private schools). Generic queries returned mostly other cities.
- EKBO church-music association job PDFs, parish sites ev-kirche-hellersdorf.de and ev-kirche-biesdorf.de, ong.berlin, berlin.de Chorstammtisch press release (2023), b1musikschule.weebly.com, musikkabinett-mahlsdorf.de.

### Added
- WND: Posaunenchor / Jugendpopchor of Ev. Kirchengemeinde Berlin-Hellersdorf (Glauchauer Str. 7).
- CHO: Gemeindechor, Gospelchor and Handglockenchor of Ev. Versöhnungskirchengemeinde Biesdorf (Alt-Biesdorf 59).
- EDU: Otto-Nagel-Gymnasium (Bläserklasse since 2022/23).
- PRV: Musikkabinett ANIMATO Mahlsdorf-Süd; B1 Musikschule (Mahlsdorf branch).

### Hiring information
- Hellersdorf parish: a KM 1 (50 %, TV-EKBO) church-musician job PDF exists on kirchenmusikerverband-ekbo.de (uploaded 2025/04, undated) covering the brass choir; not shown as open today, so offer = none_found.
- Biesdorf parish: job PDF (deadline 2026-06-30) is expired and the parish site says a new Kantor starts 2026-11-01; offer = none_found.

### Not added / doubts
- Jugendkunstschule Marzahn-Hellersdorf (Kummerower Ring 44, 12619): domain juks-mh.de now serves spam content, so no official page could be verified; music offer known only from an old newspaper listing.
- Frauenchor Berlin-Mahlsdorf e.V.: Impressum address is c/o a private person (home address), not recorded.
- Kammerchor Biesdorf (kammerchor-biesdorf.de): redirects to a third-party domain (afp24.net), not verifiable. Klangzeit-Chor Biesdorf (klangzeit-chor.com): domain does not resolve. Gemischter Chor der Polizei Berlin: site certificate mismatch; also not clearly in-district.
- Musikschule Kling Klang (Mahlsdorf 12623): page gives no street address, no email; not added.
- B1 Musikschule: Impressum names owners (not recorded) and the email is obfuscated, so no email stored. The Lichtenberg branch (Weitlingstr. 37, 10317) is outside the district.
- Otto-Nagel-Gymnasium: instruments of the Bläserklasse are not listed on the pages read (a flyer PDF returned 404), so only "wind band class" is recorded; the school's music-teacher contact is a named person, not recorded.
- Posaunenchor "Colour Brass" belongs to the Hellersdorf parish; other Posaunenchöre of Kirchenkreis Berlin-Süd-Ost not identified (no Berlin Posaunenwerk list loaded).
- No dedicated piano school (PNO) found.
- Gymnasia Sartre, Wilhelm-von-Siemens, Melanchthon still unchecked.

### Outside district
- B1 Musikschule Lichtenberg branch, Weitlingstr. 37, 10317 Berlin (https://b1musikschule.weebly.com/impressum.html).

### Incident
- The shared scratchpad file add.py was overwritten by another scout (Neukölln); I ran it by mistake and it appended a duplicate Neuköllner Oper entry to data/raw/neukoelln.json. I removed the duplicates (kept one copy); that file validates (6 entities).

## Third pass (2026-10-29)

### Searches and sources
- Chorverband Berlin JSON (360 choirs): 11 for Marzahn-Hellersdorf; 2 already in the file or reviewed earlier (Marzahner Kammerchor; Frauenzimmer, Kammerchor Biesdorf, A-Cappella, Polizei, Frauenchor Mahlsdorf stay excluded as in earlier passes).
- Vokalhelden pages (mitsingen, team, impressum); kirche-mahlsdorf.de (Musik, Stellenausschreibungen, Impressum). 3 WebSearch calls.

### Added
- CHO: Vokalhelden Hellersdorf (Kummerower Ring 42; association seat is Karl-Marx-Str. 145, 12043, Neukoelln/Friedrichshain-Kreuzberg area, not in district, so the entity uses the in-district rehearsal address). Open positions: volunteers only, so none_found.
- WND: Ev. Kirchengemeinde Mahlsdorf (Posaunenchor, Kreuzkirchenchor, Kirchenchor, recorder group, instrumental circle).

### Not added
- Maennerchor Eintracht 1892 Mahlsdorf (mc1892ev.de): Impressum address is c/o a private person; rehearsal place from the Chorverband list (Koepenicker Str. 165) is inconsistent with other church addresses. Email info@mc1892ev.de exists. Doubtful, left out.
- TagCHORianer / Tagore-Gymnasium (Sella-Hasse-Str. 25, 12687): school site unreachable (connection reset), so no official page verified; school-choir existence only in a Chorverband programme PDF.
- Weibs a cappella: no website or address in Chorverband list.
- Jugendkunstschule: still no verifiable official page.
- Gymnasia Sartre, Wilhelm-von-Siemens, Melanchthon: not checked in this pass.
- Other Posaunenchoere/Kantoreien (Marzahn-Nord, Kaulsdorf): none found.
