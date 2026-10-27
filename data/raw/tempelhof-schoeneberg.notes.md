# Tempelhof-Schöneberg notes (2026-10-27)

## Searches done
- Fetched sites of all existing entities (instruments annotated). lkms.de/orte.html for branches.
- Bing via WebFetch (WebSearch returned mostly other cities): private schools, piano, choirs, orchestras, wind bands, guitar/accordion. miz.org Berlin list (first 18 of 57 read), Das Örtliche Schöneberg list.

## Removed
- Finow-Grundschule (SESB): language-teacher post, in exclusions.json, not music teaching.
- Musik Herrfurth: string shop/workshop; its page does not teach or refer teachers (only "Lehrkräfte gesucht" link). Shops are not entities.

## Outside district
- notenkind music academy berlin, Bergstr. 1, 12169 (Steglitz-Zehlendorf), https://miz.org/de/institutionen/notenkind-music-academy-berlin-i30739
- TonArt Die Musikschule, Schützenstr. 7, 12165 Steglitz, https://www.tonart-die-musikschule.de/
- Berlin-Musikschule, Wilmersdorfer Str. 122-123, 10627, https://www.berlin-musikschule.com/
- Moa Musikschule: main seat Rathenower Str. 43, 10559 (Mitte), https://www.moamusikschule.de/ ; has a branch in this district (Familienzentrum Rubens, Rubensstr. 84, 12157 Friedenau); open ad on /stellenangebote/ (violin, clarinet, accordion, "auf Honorarbasis"). Belongs to the Mitte scout; the branch should be in its sites.
- Albert-Einstein-Gymnasium, Parchimer Allee, 12359 (Neukölln).

## Doubts
- Internationale Musikschule Berlin: Impressum gives Nachodstr. 5, 10779 (probably Charlottenburg-Wilmersdorf); I used Eisenacher Str. 49, 10823 (teaching site named on the homepage). Check after geocoding.
- Konzertchor Friedenau: site unreachable (ECONNRESET) from curl and mostly from WebFetch; address Taunusstr. 6, 12161 and phone come from a search summary of its site, no email recorded (email not confirmed on a page). Verify.
- Piano Insel: only a Gmail address is published (possibly personal), so no email recorded; contact via site form.
- LKMS: accordion listed from a district job ad (accordion orchestra), not from the Fächer page. Many school sites of LKMS (33 schools) not added to sites; only non-school locations in the district.
- Not verified (no website found): Happy Music (Apostel-Paulus-Str. 40), Silkymusic (Crellestr. 42), Schlagzeugschule Lutz Renziehausen (Schwäbische Str. 7); Das Örtliche only. Not added.
- Not found: wind bands, youth orchestras, music-profile schools, guitar/accordion schools in the district.
- Schools of LKMS (Askanisches Gymnasium, Eckener-Gymnasium, Rückert-Gymnasium etc.) show no instrument classes on their sites; not added as EDU. rueckert-gymnasium.de is a Düsseldorf school, not Berlin.

## Second pass (2026-10-27)

### Searches and sources
- 9 WebSearch calls (Posaunenchor, Kantorei, piano schools, Bläserklassen, Gitarre/Klavier/Geige, private schools by postcode): results were almost entirely other cities; nothing usable.
- Bing and DuckDuckGo via curl/WebFetch returned junk or nothing.
- Chorverband Berlin member-choir database (public JSON behind https://www.chorverband-berlin.de/choere/mitgliedschoere/, filter Bezirk Tempelhof-Schöneberg): 48 choirs/ensembles; used as the source of choirs. Each site was then opened for e-mail and Impressum.
- Gelbe Seiten (musikunterricht / musikschulen for Schöneberg, Lichtenrade, Mariendorf, Tempelhof), Das Örtliche Tempelhof, miz.org Berlin list (18 shown): nothing new with an official site.
- School sites checked for instrument classes: Eckener-Gymnasium (added), Ulrich-von-Hutten-Gymnasium, Askanisches Gymnasium (only choir/band AGs, no instrument classes, not added).

### Added (CHO 6, EDU 1)
- CHO: Kantorei Tempelhof, Lichtenrader Chor, Schöneberger Klangkörper, Akazien-Grazien, Bancanta, Knabenchor Berlin. EDU: Eckener-Gymnasium.
- For choirs the address is the rehearsal venue (church, Rathaus, school, community house), as given on the choir site or the Chorverband list. Bancanta and Knabenchor Berlin have Impressum addresses elsewhere (Bancanta in 14197; Knabenchor Ebersstr. 35, 10827, not shown to be an office), so check geocoding. Akazien-Grazien states the Rathaus as its postal address; its only e-mail is a web.de role mailbox of the choir (kept).
- No hiring information found for any of them (offer none_found).

### Removed
- Konzertchor Friedenau: listed in data/exclusions.json (domain lost, no official page); removed from the file. It still appears in the Chorverband list (Holsteinische Str. 30, 12161) without website.

### Outside district / not added
- Piano Academy Berlin, Kissinger Str. 14, 12157: geocodes to Steglitz (Steglitz-Zehlendorf), https://www.piano-academy-berlin.de
- Hermann-Ehlers-Gymnasium, Elisenstr. 3-4, 12169 (Steglitz-Zehlendorf): band, Ukulele, ensemble course.
- Vokalhelden (children's choirs, Schöneberg groups at Neumark-Grundschule Steinmetzstr. 46 and Steinmetzstr. 68): seat Karl-Marx-Str. 145, 12043 (Neukölln), https://www.vokalhelden.de; has an "Offene Stellen" section under /team. For the Neukölln scout.
- MendelssohnKammerChor Berlin: Impressum seat Eylauer Str. 12, 10965 (Friedrichshain-Kreuzberg); rehearses in Bülowstr. 71-72, Schöneberg.
- Not added because the Impressum address is a private person or c/o: Junge Sinfonie Berlin (c/o Rubensstr. 106, 12157; rehearses at Grazer Platz 4; no project planned), Berliner Figuralchor (private address in 14163), Hanns-Eisler-Chor Berlin, Treffpunkt Fermate, Gebrannte Mandeln, Chorus Berlin, Singfrauen Berlin, Lichtenrader Männerchor 1911 (personal e-mails only).
- Not added, unclear fit or unreachable: Lichtenrader Gospelchor, St. Konrad Gospelchor, tunety, Kiezchor Schöneberg (pop/gospel amateur choirs, no classical focus); Sonari-Chor (frameset page, no address or contact); Chorwerkstatt Schöneberg, ensemberlino vocale, vocal-concertisten, Kleine Berliner Chorversuchung (sites unreachable); Ensemble Polyvox (6-voice ensemble, no contact page content).
- Kantorei der Ev. Kirchengemeinde Mariendorf: the domain ev-kirchengemeinde-mariendorf.de now serves spam content (casino, Itzehoe address); not usable.
- Time to Sing! (Grunewaldstr. 91, 10823): single vocal coach, site not reachable; individual teacher, not an entity.
- Directory-only, no website: MUSIK 360° Musikunterricht (Tempelhofer Damm 149), Chinesisches Musikcentrum (Westarpstr. 5), Schlagzeugschule Renziehausen (Schwäbische Str. 7; renziehausen.de is an unrelated coaching firm), Happy Music, Silkymusic.

### Still not found
- Wind bands, Posaunenchöre, youth orchestras, piano-only schools (besides Piano Insel), guitar/accordion schools in the district; EKBO and parish sites for Schöneberg/Tempelhof either do not resolve or have no music pages. Suggest a manual check of the Chorverband "Instrumentalensemble" filter and parish newsletters.
- Hiring: no new ad found.
