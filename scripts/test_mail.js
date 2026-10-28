#!/usr/bin/env node
// Tests for src/mail.js: templates, greeting, mailto: links and .eml drafts. Only generic fixtures are used.
// The .eml is parsed with `mailparser`, which is not a project dependency. Install it in a temporary directory:
//   mkdir <temp>/bmm-mailparser && cd <temp>/bmm-mailparser && npm init -y && npm install mailparser
// and point MAILPARSER_DIR at that folder (default: <os temp dir>/bmm-mailparser).
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createRequire } = require("module");

const ROOT = path.join(__dirname, "..");
const Mail = require(path.join(ROOT, "src", "mail.js"));
const JOBS_PATH = path.join(ROOT, "data", "jobs.json");
const jobs = fs.existsSync(JOBS_PATH) ? JSON.parse(fs.readFileSync(JOBS_PATH, "utf8")) : [];

const mpDir = process.env.MAILPARSER_DIR || path.join(os.tmpdir(), "bmm-mailparser");
let simpleParser;
try {
  ({ simpleParser } = createRequire(path.join(mpDir, "x.js"))("mailparser"));
} catch (e) {
  console.error(`mailparser not found in ${mpDir}. Install it once with:\n` +
    `  npm install --prefix "${mpDir}" mailparser\n` +
    "or set MAILPARSER_DIR to a folder that has it.");
  process.exit(2);
}

let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed++; }
function eq(a, b, msg) { assert.strictEqual(a, b, msg); passed++; }

// Generic user profile (nobody real): the defaults are empty, tests fill them in
const PROFILE = {
  name: "Alex Example",
  email: "alex@example.org",
  signature: "Alex Example\nalex@example.org",
  cvLink: "",
  teachingLanguages: ["de", "en", "es", "it"],
  instrument: { de: "Violine", en: "violin", es: "violín", it: "violino" },
  bio: { de: "", en: "", es: "", it: "" },
};
const S = Mail.normalizeSettings(PROFILE);
const ent = (over) => Object.assign({ id: "mitte-test-school", name: "Test Music School", category: "PRV", contact: { email: "info@example.org" }, offer: { status: "none_found" }, email_language: "de" }, over);

(async () => {
  /* ---------- defaults carry no personal data ---------- */
  const D = Mail.defaultSettings();
  eq(D.name, "");
  eq(D.email, "");
  eq(D.signature, "");
  eq(D.cvLink, "");
  ok(Mail.LANGS.every((l) => D.instrument[l] === "" && D.bio[l] === ""), "instrument and bio start empty in every language");
  eq(D.teachingLanguages.length, 0);
  const blank = Mail.compose(ent(), D);
  eq(blank.subject, "Initiativbewerbung: Musikunterricht", "an empty profile still gives a sensible subject");
  ok(!/\{\{|undefined|null/.test(blank.body), "empty profile leaves no unresolved placeholders");
  ok(blank.body.startsWith("Sehr geehrtes Team von Test Music School,") && blank.body.includes("Mit freundlichen Grüßen"), "empty profile: greeting and closing remain");
  ok(!/Unterrichtssprachen|mein Name/.test(blank.body), "lines with empty placeholders are left out");

  /* ---------- languages ---------- */
  eq(Mail.languageList(["de", "en", "es", "it"], "de"), "Deutsch, Englisch, Spanisch und Italienisch");
  eq(Mail.languageList(["de", "en", "es", "it"], "en"), "German, English, Spanish and Italian");
  eq(Mail.languageList(["de", "en", "es", "it"], "es"), "alemán, inglés, español e italiano");
  eq(Mail.languageList(["de", "en", "es", "it"], "it"), "tedesco, inglese, spagnolo e italiano");
  eq(Mail.languageList(["es"], "it"), "spagnolo");
  eq(Mail.languageList([], "de"), "");

  /* ---------- greeting: always the team of the entity ---------- */
  const team = ent({ name: "Example Music School (District Office Mitte)", contact: { email: "a@example.org" } });
  eq(Mail.greeting(team, "de"), "Sehr geehrtes Team von Example Music School,");
  eq(Mail.greeting(team, "en"), "Dear Example Music School team,");
  eq(Mail.greeting(team, "es"), "Estimado equipo de Example Music School:");
  eq(Mail.greeting(team, "it"), "Gentile team di Example Music School,");
  // fields about people are ignored: there is no Frau/Herr logic
  eq(Mail.greeting(ent({ contact: { contact_person: "Frau Muster", contact_title: "Frau", contact_surname: "Muster" } }), "de"), "Sehr geehrtes Team von Test Music School,");
  // German grammar: article or plural names take the genitive, a subtitle after a colon is dropped
  const deGreet = (name) => Mail.greeting(ent({ name }), "de");
  eq(deGreet("Die Schottenkinder e.V."), "Sehr geehrtes Team der Schottenkinder e.V.,");
  eq(deGreet("Chöre der Ev. Kirchengemeinde Kreuzberg"), "Sehr geehrtes Team der Chöre der Ev. Kirchengemeinde Kreuzberg,");
  eq(deGreet("Ev. Kirchengemeinde Friedrichshagen: Kirchenmusik"), "Sehr geehrtes Team von Ev. Kirchengemeinde Friedrichshagen,");
  eq(deGreet("Der Beispielchor"), "Sehr geehrte Damen und Herren,");
  eq(deGreet("Kantorei Tempelhof"), "Sehr geehrtes Team von Kantorei Tempelhof,");
  ok(!("parsePerson" in Mail), "no person parsing in the module");
  eq(Mail.cleanName("Haus (X)"), "Haus (X)", "short names are left alone");
  eq(Mail.cleanName("Fröbel-Musikschule \"Fame\" (Bezirksamt)"), "Fröbel-Musikschule \"Fame\"");

  /* ---------- templates ---------- */
  let m = Mail.compose(ent(), S);
  ok(m.body.startsWith("Sehr geehrtes Team von Test Music School,"), "greeting in the body");
  ok(!/\{\{/.test(m.body + m.subject), "no unresolved placeholders");
  ok(!/Lebenslauf/.test(m.body), "without a CV link the CV line is left out");
  eq(m.subject, "Initiativbewerbung: Unterricht in Violine – Alex Example");
  eq(m.variant, "initiative");
  ok(m.body.includes("Unterrichtssprachen: Deutsch, Englisch, Spanisch und Italienisch."));
  ok(m.body.includes("Ich unterrichte Violine in Berlin."));
  ok(!/\n\n\n/.test(m.body), "no double blank lines");
  const S2 = Mail.normalizeSettings(Object.assign({}, PROFILE, { cvLink: "https://example.org/cv.pdf" }));
  m = Mail.compose(ent(), S2);
  ok(m.body.includes("Meinen Lebenslauf finden Sie hier: https://example.org/cv.pdf"));
  m = Mail.compose(ent(), S, { cvAttached: true });
  ok(m.body.includes("Meinen Lebenslauf finden Sie im Anhang."), "attached CV without a link");
  m = Mail.compose(ent(), S2, { cvAttached: true });
  ok(m.body.includes("hier: https://example.org/cv.pdf") && !m.body.includes("im Anhang"), "with a link and an attachment, the link wins");
  const posted = ent({ name: "Example Youth Orchestra (Verein)", category: "ENS", offer: { status: "posted", title: "String teacher (m/f/d)", url: "https://example.org/job" }, email_language: "de" });
  m = Mail.compose(posted, S);
  eq(m.variant, "posted");
  eq(m.subject, "Bewerbung: String teacher (m/f/d) – Alex Example");
  ok(m.body.includes("„String teacher (m/f/d)“ (https://example.org/job)"));
  for (const lang of Mail.LANGS) for (const variant of Mail.VARIANTS) {
    const r = Mail.compose(posted, S, { lang, variant });
    ok(!/\{\{|undefined|null/.test(r.subject + r.body), `template ${lang}/${variant} is complete`);
    ok(r.body.includes(Mail.greeting(posted, lang)), `greeting ${lang}`);
    ok(r.body.includes(PROFILE.signature), `signature ${lang}/${variant}`);
    ok(r.body.includes(PROFILE.instrument[lang]), `instrument ${lang}/${variant}`);
    ok(r.subject.includes("Alex Example"), `name in subject ${lang}/${variant}`);
  }
  // the "posted" variant mentions the ad, the spontaneous one does not
  ok(Mail.compose(posted, S, { lang: "en", variant: "posted" }).body.includes("https://example.org/job"));
  ok(!Mail.compose(posted, S, { lang: "en", variant: "initiative" }).body.includes("https://example.org/job"));
  // the default variant follows the offer status
  eq(Mail.compose(ent({ offer: { status: "initiative_welcome" } }), S).variant, "initiative");
  eq(Mail.compose(ent({ offer: { status: "none_found" } }), S).variant, "initiative");
  eq(Mail.compose(ent({ email_language: "es" }), S).lang, "es", "the default language is the entity's");
  // gender-neutral wording in the default texts
  ok(!/Musiker|músico|musicista/.test(JSON.stringify(Mail.DEFAULT_TEMPLATES)), "default texts do not assume a gender");

  /* ---------- {{role}} for the nine categories, in four languages ---------- */
  const ROLES = {
    MUN: ["Unterricht in Violine", "violin teaching", "clases de violín", "lezioni di violino"],
    PRV: ["Unterricht in Violine", "violin teaching", "clases de violín", "lezioni di violino"],
    PNO: ["Klavierunterricht", "piano teaching", "clases de piano", "lezioni di pianoforte"],
    WND: ["Unterricht für Holz- und Blechblasinstrumente", "wind and brass teaching", "clases de viento madera y metal", "lezioni di strumenti a fiato e ottoni"],
    EDU: ["Instrumentalunterricht an Schulen", "instrumental teaching in schools", "clases de instrumento en centros escolares", "insegnamento strumentale nelle scuole"],
    HOC: ["Instrumentalunterricht auf Hochschulniveau", "instrumental teaching at conservatory level", "clases de instrumento a nivel de conservatorio", "insegnamento strumentale a livello di conservatorio"],
    ENS: ["Registerproben und Ensemblearbeit", "section coaching and ensemble work", "ensayos de sección y trabajo de conjunto", "prove di sezione e lavoro d'insieme"],
    OUT: ["Musikvermittlung und kulturelle Bildung", "music outreach and education programmes", "mediación musical y programas educativos", "educazione e mediazione musicale"],
    CHO: ["Gesangs- und Chorunterricht", "singing and choir teaching", "clases de canto y coro", "insegnamento di canto e coro"],
  };
  for (const [cat, [de, en, es, it]] of Object.entries(ROLES)) {
    Mail.LANGS.forEach((lang, i) => {
      const inst = PROFILE.instrument[lang];
      eq(Mail.rolePhrase(ent({ category: cat }), lang, inst), [de, en, es, it][i], `role ${cat}/${lang}`);
    });
  }
  eq(Mail.rolePhrase(ent({ category: "MUN" }), "en", ""), "music teaching", "no instrument: general phrase");
  eq(Mail.rolePhrase(ent({ category: "PRV" }), "de", ""), "Musikunterricht");
  eq(Mail.rolePhrase(ent({ category: "XXX" }), "es", ""), "clases de música", "unknown category: general phrase");
  eq(Mail.rolePhrase(ent({ category: "CHO" }), "en", "cello"), "singing and choir teaching", "CHO ignores the instrument");
  // categories of the old project must not be handled any more
  ok(!/photograph|Fotograf|substitute|Orchesteraushilfe/i.test(["MUN", "PRV", "XXX"].map((c) => Mail.rolePhrase(ent({ category: c }), "de", "")).join(" ")));

  /* ---------- settings: import and defaults ---------- */
  const imported = Mail.normalizeSettings({ name: 42, email: "x@example.org", teachingLanguages: ["de", "xx"], instrument: { de: "Cello", fr: "x" }, templates: { de: { posted: { subject: "S", body: 7 } } } });
  eq(imported.name, "", "wrong types fall back to the default");
  eq(imported.email, "x@example.org");
  eq(imported.teachingLanguages.join(), "de", "unknown languages are dropped");
  eq(imported.instrument.de, "Cello");
  ok(!("fr" in imported.instrument));
  eq(imported.templates.de.posted.subject, "S");
  eq(imported.templates.de.posted.body, Mail.DEFAULT_TEMPLATES.de.posted.body, "invalid body keeps the default");
  eq(JSON.stringify(Mail.normalizeSettings(JSON.parse(JSON.stringify(S)))), JSON.stringify(S), "export then import is lossless");

  /* ---------- mailto with accents, ñ, ä, ö, ü and ß ---------- */
  const spicy = Mail.normalizeSettings(Object.assign({}, PROFILE, {
    name: "José Ñandú Müller-Öztürk",
    signature: "José Ñandú\nStraße 1, Köln · ¿Qué tal? ¡Hola! – “quotes” €",
    bio: Object.assign({}, PROFILE.bio, { de: "Außerdem: äöüÄÖÜ ß, áéíóú ñ, à è ì ò ù, ç" }),
  }));
  const em = ent({ name: "Fröbel-Musikschule Köln & Söhne (Öffentlich)", contact: { email: "bewerbung@müller-schule.example" } });
  m = Mail.compose(em, spicy);
  let mt = Mail.buildMailto(m.to, m.subject, m.body);
  ok(/^[\x21-\x7e]+$/.test(mt.url), "the mailto link is pure ASCII");
  ok(mt.url.startsWith("mailto:bewerbung@m%C3%BCller-schule.example?subject="), "recipient keeps a literal @");
  ok(mt.url.includes("%C3%A4%C3%B6%C3%BC") && mt.url.includes("%C3%9F") && mt.url.includes("%C3%B1") && mt.url.includes("%C3%A1%C3%A9%C3%AD%C3%B3%C3%BA"), "accents, ñ, ä, ö, ü and ß are UTF-8 encoded");
  ok(mt.url.includes("%0D%0A") && !/%0A(?<!%0D%0A)/.test(mt.url.replace(/%0D%0A/g, "")), "CRLF line breaks");
  const q = new URL(mt.url.replace("mailto:", "mailto://x/")).searchParams;
  const subj = decodeURIComponent(mt.url.match(/subject=([^&]*)/)[1]);
  const body = decodeURIComponent(mt.url.match(/body=(.*)$/)[1]);
  eq(subj, m.subject);
  eq(body, m.body.replace(/\n/g, "\r\n"));
  ok(body.includes("äöüÄÖÜ ß, áéíóú ñ"));
  ok(subj.includes("José Ñandú Müller-Öztürk"));
  ok(q.get("subject") === m.subject, "URLSearchParams reads it too");
  ok(!mt.tooLong, "a normal message is under 2000");
  const longBody = m.body + "\n" + "Ä".repeat(400);
  mt = Mail.buildMailto(m.to, m.subject, longBody);
  ok(mt.tooLong && mt.length > 2000, "warning for a mailto link over 2000 characters");
  for (const lang of Mail.LANGS) {
    const r = Mail.compose(posted, S, { lang });
    const mm = Mail.buildMailto(r.to, r.subject, r.body);
    console.log(`  mailto ${lang}: ${mm.length} encoded characters ${mm.tooLong ? "(WARNING)" : ""}`);
  }

  /* ---------- .eml ---------- */
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from(Array.from({ length: 6000 }, (_, i) => (i * 37 + 11) & 255)), Buffer.from("\n%%EOF\n")]);
  const longSubject = "Initiativbewerbung: Unterricht in Violine – José Ñandú Müller-Öztürk, Köln (äöüß ¿?) " + "x".repeat(20);
  let eml = Mail.buildEml({
    to: "bewerbung@example.org", from: { name: "José Ñandú Müller", email: "jose@example.org" },
    subject: longSubject, body: spicy.signature + "\n\n" + m.body, attachment: { name: "Lebenslauf José.pdf", type: "application/pdf", bytes: pdf },
    boundary: "=_bmm_TEST", date: new Date("2026-10-16T08:00:00Z"),
  });
  ok(/^[\x00-\x7f]*$/.test(eml), ".eml is ASCII (everything else is encoded)");
  ok(eml.includes("\r\n") && !/(^|[^\r])\n/.test(eml), "CRLF only");
  ok(/^X-Unsent: 1\r\n/m.test(eml), "X-Unsent: 1 header");
  ok(/^MIME-Version: 1\.0\r\n/m.test(eml));
  ok(/^Content-Type: multipart\/mixed; boundary="=_bmm_TEST"\r\n/m.test(eml), "multipart/mixed");
  ok(/^Subject: =\?UTF-8\?B\?/m.test(eml), "RFC 2047 UTF-8 subject");
  ok(/Content-Type: text\/plain; charset=UTF-8/.test(eml));
  ok(/Content-Type: application\/pdf; name=/.test(eml) && /Content-Disposition: attachment; filename="Lebenslauf Jos_.pdf"; filename\*=UTF-8''Lebenslauf%20Jos%C3%A9\.pdf/.test(eml), "attachment name with RFC 2231");
  const headerBlock = eml.split("\r\n\r\n")[0];
  headerBlock.split("\r\n").forEach((l) => ok(l.length <= 78, "short header line: " + l.length));
  (headerBlock.match(/=\?UTF-8\?B\?[^?]*\?=/g) || []).forEach((w) => ok(w.length <= 75, "encoded word <= 75"));
  const pdfPart = eml.split("Content-Disposition: attachment")[1].split("\r\n\r\n")[1].split("\r\n--=_bmm_TEST--")[0];
  const pdfLines = pdfPart.split("\r\n").filter(Boolean);
  ok(pdfLines.length > 50, "PDF spread over many lines");
  pdfLines.slice(0, -1).forEach((l) => eq(l.length, 76, "base64 line of 76"));
  ok(pdfLines[pdfLines.length - 1].length <= 76);
  let parsed = await simpleParser(Buffer.from(eml, "ascii"));
  eq(parsed.subject, longSubject, "subject decoded by mailparser");
  eq(parsed.to.value[0].address, "bewerbung@example.org");
  eq(parsed.from.value[0].address, "jose@example.org");
  eq(parsed.from.value[0].name, "José Ñandú Müller");
  eq(parsed.text.replace(/\r\n/g, "\n").trimEnd(), (spicy.signature + "\n\n" + m.body).trimEnd(), "UTF-8 body intact");
  eq(parsed.attachments.length, 1);
  eq(parsed.attachments[0].contentType, "application/pdf");
  eq(parsed.attachments[0].filename, "Lebenslauf José.pdf");
  ok(Buffer.compare(parsed.attachments[0].content, pdf) === 0, "the PDF comes out identical");
  eq(parsed.headers.get("x-unsent"), "1");
  eq(parsed.date.toISOString(), "2026-10-16T08:00:00.000Z");
  // no attachment and no sender
  eml = Mail.buildEml({ to: "", subject: "Betreff", body: "Hallo\nWelt" });
  parsed = await simpleParser(Buffer.from(eml, "ascii"));
  eq(parsed.subject, "Betreff");
  eq(parsed.attachments.length, 0);
  eq(parsed.text.replace(/\r\n/g, "\n").trim(), "Hallo\nWelt");
  ok(!parsed.to, "no recipient");
  eq(parsed.headers.get("x-unsent"), "1");
  // sender name with commas or dots
  eml = Mail.buildEml({ to: "a@example.org", from: { name: "Example, A.", email: "s@example.org" }, subject: "x", body: "y" });
  parsed = await simpleParser(Buffer.from(eml, "ascii"));
  eq(parsed.from.value[0].name, "Example, A.");
  // base64 and RFC 2047 against Buffer
  for (const n of [0, 1, 2, 3, 4, 5, 76, 77, 1000]) {
    const bytes = Uint8Array.from(Array.from({ length: n }, (_, i) => (i * 7) & 255));
    eq(Mail.base64(bytes), Buffer.from(bytes).toString("base64"), "base64 of " + n + " bytes");
  }
  // file name of the draft: slug of the entity
  eq(Mail.slugify("Fröbel-Musikschule Köln & Söhne"), "frobel-musikschule-koln-sohne");
  eq(Mail.slugify("Straße Ñandú"), "strasse-nandu");
  eq(Mail.slugify("mitte-test-school"), "mitte-test-school");

  /* ---------- every entity of the data set, every language and variant ---------- */
  if (jobs.length) {
    let n = 0;
    for (const e of jobs) {
      for (const lang of Mail.LANGS) for (const variant of Mail.VARIANTS) {
        const r = Mail.compose(e, S, { lang, variant });
        if (/\{\{|undefined|\bnull\b/.test(r.subject + r.body)) throw new Error("incomplete template for " + e.id + " " + lang + "/" + variant + "\n" + r.body);
        if (!r.body.startsWith(Mail.greeting(e, lang))) throw new Error("greeting missing for " + e.id);
        const mm = Mail.buildMailto(r.to, r.subject, r.body);
        if (!/^[\x21-\x7e]+$/.test(mm.url)) throw new Error("mailto is not ASCII for " + e.id);
        n++;
      }
    }
    console.log(`  ${n} combinations of entity x language x variant composed with no unresolved placeholders`);
    const real = jobs.find((e) => e.contact && e.contact.email) || jobs[0];
    const r = Mail.compose(real, S, { cvAttached: true });
    eml = Mail.buildEml({ to: r.to, from: { name: S.name, email: S.email }, subject: r.subject, body: r.body, attachment: { name: "cv.pdf", bytes: pdf } });
    parsed = await simpleParser(Buffer.from(eml, "ascii"));
    eq(parsed.subject, r.subject);
    ok(parsed.text.includes("im Anhang") || /attached|Adjunto|allegato/.test(parsed.text));
    eq(parsed.attachments[0].filename, "cv.pdf");
  }

  console.log(`OK: ${passed} checks`);
})().catch((e) => { console.error("FAILED:", e && e.stack || e); process.exit(1); });
