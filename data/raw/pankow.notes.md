# Pankow notes (2026-10-27)

## Searches done
14 WebSearch calls (private schools Prenzlauer Berg/Weißensee/Pankow, wind bands, choirs, piano schools, guitar/accordion, schools with instrument classes, amateur orchestras, Datenklang, singing schools, Singschule) plus WebFetch of the municipal school, the entities' sites and Das Örtliche.

## Removed
- Phorms Campus Berlin Prenzlauer Berg (EDU): no instrument teaching confirmed on its career page; address postcode 10249 also doubtful.

## Contacts fixed
- Klangbaum: personal-looking email (sven@) replaced by buero@klangbaum.de (Impressum).
- Kammerorchester Weißensee: gmail address replaced by the Musikschule generic email.
- Musikschule Béla Bartók: added musikschule@ba-pankow.berlin.de.
- Not found as generic email: tomatenklang kept; Wundermusikschule kept; Phorms removed.

## Added
- Musikakademie Ohrpheo (PNO), Lisbeth und Franz (PRV).

## Failed or thin sources
- vocasa.de (Vocasa Vocal School, Mühlenstr. 62, 13187): HTTP 403, no verifiable email; not added.
- Evangelische Singschule Prenzlauer Berg Nord (CHO candidate): no official page found; not added.
- Datenklang: only an old document, no current site found.
- Search tool returned mostly municipal pages; Pankow private schools, piano schools, wind bands, EDU schools with instrument classes and amateur orchestras are probably under-covered. Jugendblasorchester Pankow, Elias-Hof-Orchester, Kinderchöre etc. are ensembles of the municipal school (included in its entry, not separate).
- Pay dataset for Musikschule Béla Bartók: its page lists "Honorarkraft"-type fees from the Senate PDF already in the entry.

## Outside district
None.

## Doubts
- Kammerorchester Weißensee is a branch ensemble of the MUN; consider merging into the MUN entry.
- Klangbaum contract.is_guess true (pre-existing).

## Second pass (2026-10-27)

### Searches and sources
- 7 WebSearch calls (mostly other cities again). Productive sources: Kirchenkreis Berlin Nord-Ost music pages (/musik/choere-und-gruppen: Kirchenchöre, Posaunenchöre, Kinderchöre, Instrumentalgruppen), the parish sites linked from them, Das Örtliche lists (Musikschule Pankow / Prenzlauer Berg / Weißensee), direct curl checks of piano-school domains.
- Failed: gethsemanekirche.de (SSL handshake error), zionskirche-berlin.de (connection reset), kirche-pankow.de and kirchenkreis-pankow.de (no such host), kirche-blankenburg.de choir page (404), vocasa.de (403), westerland-schule.de (old domain, real site is westerlandschule.de), miz.org (no district filter).

### Added (14)
- PNO (2): Klavierschule Berlin (Lychener Str. 12; ad for "Honorarkräfte"), Klavierschule Berenstein (Prenzlauer Berg site Schliemannstr. 17; main sites in Mitte, job ad "auf Honorarbasis" for the Schliemannstraße site). The Mitte scout may also list Berenstein by its Bergstraße address; keep one.
- WND (4): Bläserchor Hoffnungskirche Pankow, Bläserchor Friedenskirche Niederschönhausen, Posaunenchor Weißensee, Posaunenchor Rosenthal-Wilhelmsruh.
- CHO (7): Kantorei Hoffnungskirche Pankow, Konzertchor Niederschönhausen, Chor der KG Weißensee, Kantorei Alt-Pankow, Kantorei Französisch Buchholz, Chöre der Martin-Luther-Kirchengemeinde (Lutherchor, Popchor, Kinderchor), Kirchenchor Rosenthal-Wilhelmsruh.
- PRV (1): Westerland Musikschule (Prenzlauer Promenade 149-152).
- EDU: none found (no school instrument-class page located; Senate does not publish a list of school orchestras).

### Skipped, with reasons
- Posaunenchor / Kantorei Kapernaum and Lazarus-Posaunenchor: parishes are in Wedding/Mitte, not Pankow.
- Musikschule Peu a Peu (Achtermannstr. 15): gmail contact, GbR of individuals, Impressum not readable; possibly a private address.
- MyMusicSchool GmbH (listed in Das Örtliche for Oderberger Str. 18): website shows a company in Dettenheim and no Berlin site.
- Tastsinn-Klavierstudio, Die Kleinen Klangzauberer, individual teachers in Das Örtliche (Altgenug, Andresen, Felgentreff, Kroß, Lettberg, Staffel, etc.): individuals or no verifiable website.
- Posaunenchöre Alt-Pankow, Buch, Karow, Schlosskirchengemeinde Buch choir, Blankenburg choir: listed by the Kirchenkreis without a page; to be checked in a later pass.
- Evangelische Singschule / Jugendchor Lutherhaus (Regionaler Jugendchor): covered inside the Lutherhaus entry.

### Doubts
- Rosenthal-Wilhelmsruh entries have no email: the only address shown is a free-mail (mail.de) parish box; not recorded.
- Church groups run by parishes: all offers are none_found; "new members wanted" refers to players and singers, not teachers.
- Klavierschule Berlin has no Impressum link (address and email taken from its contact page).

## Third pass (2026-10-29)

### Searches and sources
- Chorverband Berlin JSON (360 choirs, 38 in Pankow). 2 WebSearch calls for Posaunenchöre Alt-Pankow/Buch/Karow (nothing relevant), WebFetch of the choir sites, alt-pankow.de.
- Failed: kirche-berlin-nordost.de Posaunenchor page (ECONNRESET), vocasa.de (403 again), spirited.de and soundshakeberlin.de (no connection), chordichgluecklich.de (403), entrevoces.de/impressum (404).

### Added (7)
- CHO (6): Singschule Prenzlauer Berg Nord (Göhrener Str. 11; replaces the single Elias-based children's/youth choirs listed in the Chorverband JSON), Chor LiedGut Weißensee, Canto Ergo Sum, Coro EntreVoces, CoroConBrio, amici musicae Kammerchor.
- WND (1): Bläserkreis Alt-Pankow (no email: the page shows only a link containing a personal name).

### Skipped, with reasons
- Konzertchor Berliner Pädagogen: its own site says rehearsals are in Friedrichshain (Koppenstr. 76), not Pankow.
- Joyful Singers: domain redirects to joyfulsingersberlin.de; not checked further. Fine Voices: no rehearsal address. panCHORaner (gmx box), hardChorELLA (web.de box), JazzVocals, Gemischter Chor Berlin-Pankow (gmail), Soundshake, Spirited, Erich-Fried-Chor, Carl-von-Ossietzky-Chor, Berliner Vokalkreis, Fugatonale, enchore, Indie Pop Chor: no generic institutional email or site not verified in this pass; candidates for a later pass.
- School choirs (Young Voices, Bornholmer Grundschule), Kinderchor der Musikschule Pankow: covered by the schools or the MUN entry.
- Peu a Peu, MyMusicSchool, Tastsinn, Kleinen Klangzauberer, Vocasa: still not verifiable, not added.
- Posaunenchöre Buch and Karow: no official page found.

### Doubts
- Coro Con Brio's rehearsal place comes from the Chorverband JSON; its own site gives no place.
- Bläserkreis Alt-Pankow address is the parish address used for the Kantorei; the page names no rehearsal room.
