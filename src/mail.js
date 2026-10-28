/* Email logic of the map: templates, greeting, mailto: links and .eml drafts.
 * No dependencies and no DOM access: it runs in the browser (global BMMMail) and in Node (require),
 * so scripts/test_mail.js can test it. There is no personal data in this file. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BMMMail = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var LANGS = ["de", "en", "es", "it"];
  var LANG_NAMES = { de: "Deutsch", en: "English", es: "Español", it: "Italiano" }; // each language in its own name
  var LANG_NAMES_EN = { de: "German", en: "English", es: "Spanish", it: "Italian" };
  var VARIANTS = ["initiative", "posted"];
  var VARIANT_NAMES = { initiative: "Spontaneous application", posted: "Answer to a job ad" };

  // Names of the teaching languages, written in the language of the template
  var LANGUAGE_WORDS = {
    de: { de: "Deutsch", en: "Englisch", es: "Spanisch", it: "Italienisch" },
    en: { de: "German", en: "English", es: "Spanish", it: "Italian" },
    es: { de: "alemán", en: "inglés", es: "español", it: "italiano" },
    it: { de: "tedesco", en: "inglese", es: "spagnolo", it: "italiano" },
  };
  var AND = { de: "und", en: "and", es: "y", it: "e" };

  function languageList(codes, lang) {
    var words = LANGUAGE_WORDS[lang] || LANGUAGE_WORDS.de;
    var list = LANGS.filter(function (c) { return (codes || []).indexOf(c) >= 0; }).map(function (c) { return words[c]; });
    if (list.length === 0) return "";
    if (list.length === 1) return list[0];
    var and = AND[lang] || "und";
    if (lang === "es" && /^(i|hi)/i.test(list[list.length - 1])) and = "e";
    return list.slice(0, -1).join(", ") + " " + and + " " + list[list.length - 1];
  }

  /* Entity name for the greeting and the text, without a clarifying parenthesis at the end. */
  function cleanName(name) {
    var n = String(name || "").trim();
    var m = n.match(/^(.{6,}?)\s*\([^()]*\)$/);
    return m ? m[1].trim() : n;
  }

  /* The data has no names of people, so the greeting always addresses the team of the entity. */
  function greeting(entity, lang) {
    var name = cleanName(entity && entity.name);
    switch (lang) {
      case "en": return "Dear " + name + " team,";
      case "es": return "Estimado equipo de " + name + ":";
      case "it": return "Gentile team di " + name + ",";
      default: return germanGreeting(name);
    }
  }

  /* "Team von <name>" is only right for a singular proper name. A name that starts with an article ("Die …") or a plural
     ("Chöre der …") needs the genitive ("Team der …"); one with a subtitle after a colon keeps the part before it;
     "Der …" and "Das …" would need a gendered genitive, so they get the neutral form. */
  function germanGreeting(name) {
    var n = name.split(":")[0].trim();
    if (/^(der|das)\s/i.test(n)) return "Sehr geehrte Damen und Herren,";
    var art = n.match(/^die\s+(.+)$/i);
    if (art) return "Sehr geehrtes Team der " + art[1] + ",";
    if (/^Chöre\s/.test(n)) return "Sehr geehrtes Team der " + n + ",";
    return "Sehr geehrtes Team von " + n + ",";
  }

  /* What the sender offers, by category of the entity ({{role}}). It reads after "in the area of" / "im Bereich". */
  function rolePhrase(entity, lang, instrument) {
    var cat = (entity && entity.category) || "";
    var i = (instrument || "").trim();
    var T = {
      music: {
        de: i ? "Unterricht in " + i : "Musikunterricht",
        en: i ? i + " teaching" : "music teaching",
        es: i ? "clases de " + i : "clases de música",
        it: i ? "lezioni di " + i : "lezioni di musica",
      },
      PNO: {
        de: "Klavierunterricht",
        en: "piano teaching",
        es: "clases de piano",
        it: "lezioni di pianoforte",
      },
      WND: {
        de: "Unterricht für Holz- und Blechblasinstrumente",
        en: "wind and brass teaching",
        es: "clases de viento madera y metal",
        it: "lezioni di strumenti a fiato e ottoni",
      },
      EDU: {
        de: "Instrumentalunterricht an Schulen",
        en: "instrumental teaching in schools",
        es: "clases de instrumento en centros escolares",
        it: "insegnamento strumentale nelle scuole",
      },
      HOC: {
        de: "Instrumentalunterricht auf Hochschulniveau",
        en: "instrumental teaching at conservatory level",
        es: "clases de instrumento a nivel de conservatorio",
        it: "insegnamento strumentale a livello di conservatorio",
      },
      ENS: {
        de: "Registerproben und Ensemblearbeit",
        en: "section coaching and ensemble work",
        es: "ensayos de sección y trabajo de conjunto",
        it: "prove di sezione e lavoro d'insieme",
      },
      OUT: {
        de: "Musikvermittlung und kulturelle Bildung",
        en: "music outreach and education programmes",
        es: "mediación musical y programas educativos",
        it: "educazione e mediazione musicale",
      },
      CHO: {
        de: "Gesangs- und Chorunterricht",
        en: "singing and choir teaching",
        es: "clases de canto y coro",
        it: "insegnamento di canto e coro",
      },
    };
    // MUN and PRV (and any unknown category) use the instrument typed in the settings
    var key = T[cat] ? cat : "music";
    return T[key][lang] || T[key].de;
  }

  var ATTACHED_LINE = {
    de: "Meinen Lebenslauf finden Sie im Anhang.",
    en: "My CV is attached.",
    es: "Adjunto mi currículum.",
    it: "In allegato trova il mio curriculum.",
  };

  /* ---------- default templates ---------- */
  var DEFAULT_TEMPLATES = {
    de: {
      initiative: {
        subject: "Initiativbewerbung: {{role}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "mein Name ist {{my_name}}.",
          "Ich unterrichte {{instrument}} in Berlin.",
          "Unterrichtssprachen: {{languages}}.",
          "{{bio}}",
          "",
          "Gerne würde ich bei Ihnen im Bereich {{role}} mitarbeiten, in Teilzeit oder auf Stundenbasis.",
          "Meinen Lebenslauf finden Sie hier: {{cv_link}}",
          "",
          "Über eine Rückmeldung freue ich mich.",
          "",
          "Mit freundlichen Grüßen",
          "{{signature}}",
        ].join("\n"),
      },
      posted: {
        subject: "Bewerbung: {{position_title}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "hiermit bewerbe ich mich auf die ausgeschriebene Stelle „{{position_title}}“ ({{offer_url}}).",
          "",
          "Mein Name ist {{my_name}}.",
          "Ich unterrichte {{instrument}} in Berlin.",
          "Unterrichtssprachen: {{languages}}.",
          "{{bio}}",
          "",
          "Meinen Lebenslauf finden Sie hier: {{cv_link}}",
          "",
          "Über eine Einladung zu einem Gespräch oder Probeunterricht freue ich mich.",
          "",
          "Mit freundlichen Grüßen",
          "{{signature}}",
        ].join("\n"),
      },
    },
    en: {
      initiative: {
        subject: "Spontaneous application: {{role}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "My name is {{my_name}}.",
          "I teach {{instrument}} in Berlin.",
          "Teaching languages: {{languages}}.",
          "{{bio}}",
          "",
          "I would be glad to work with {{entity_name}} in the area of {{role}}, part-time or on an hourly basis.",
          "You can find my CV here: {{cv_link}}",
          "",
          "I would be delighted to hear from you.",
          "",
          "Kind regards",
          "{{signature}}",
        ].join("\n"),
      },
      posted: {
        subject: "Application: {{position_title}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "I am writing to apply for the position “{{position_title}}” ({{offer_url}}).",
          "",
          "My name is {{my_name}}.",
          "I teach {{instrument}} in Berlin.",
          "Teaching languages: {{languages}}.",
          "{{bio}}",
          "",
          "You can find my CV here: {{cv_link}}",
          "",
          "I would be glad to come in for an interview or a trial lesson.",
          "",
          "Kind regards",
          "{{signature}}",
        ].join("\n"),
      },
    },
    es: {
      initiative: {
        subject: "Candidatura espontánea: {{role}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "Me llamo {{my_name}}.",
          "Doy clases de {{instrument}} en Berlín.",
          "Idiomas de enseñanza: {{languages}}.",
          "{{bio}}",
          "",
          "Me gustaría colaborar con {{entity_name}} en el ámbito de {{role}}, a tiempo parcial o por horas.",
          "Puede consultar mi currículum aquí: {{cv_link}}",
          "",
          "Quedo a la espera de su respuesta.",
          "",
          "Un cordial saludo",
          "{{signature}}",
        ].join("\n"),
      },
      posted: {
        subject: "Candidatura: {{position_title}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "Le escribo para presentar mi candidatura al puesto «{{position_title}}» ({{offer_url}}).",
          "",
          "Me llamo {{my_name}}.",
          "Doy clases de {{instrument}} en Berlín.",
          "Idiomas de enseñanza: {{languages}}.",
          "{{bio}}",
          "",
          "Puede consultar mi currículum aquí: {{cv_link}}",
          "",
          "Quedo a su disposición para una entrevista o una clase de prueba.",
          "",
          "Un cordial saludo",
          "{{signature}}",
        ].join("\n"),
      },
    },
    it: {
      initiative: {
        subject: "Candidatura spontanea: {{role}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "mi chiamo {{my_name}}.",
          "Insegno {{instrument}} a Berlino.",
          "Lingue di insegnamento: {{languages}}.",
          "{{bio}}",
          "",
          "Mi piacerebbe collaborare con {{entity_name}} nell'ambito di {{role}}, a tempo parziale o a ore.",
          "Può consultare il mio curriculum qui: {{cv_link}}",
          "",
          "Resto in attesa di un Suo riscontro.",
          "",
          "Cordiali saluti",
          "{{signature}}",
        ].join("\n"),
      },
      posted: {
        subject: "Candidatura: {{position_title}} – {{my_name}}",
        body: [
          "{{greeting}}",
          "",
          "Le scrivo per candidarmi alla posizione «{{position_title}}» ({{offer_url}}).",
          "",
          "Mi chiamo {{my_name}}.",
          "Insegno {{instrument}} a Berlino.",
          "Lingue di insegnamento: {{languages}}.",
          "{{bio}}",
          "",
          "Può consultare il mio curriculum qui: {{cv_link}}",
          "",
          "Resto a disposizione per un colloquio o una lezione di prova.",
          "",
          "Cordiali saluti",
          "{{signature}}",
        ].join("\n"),
      },
    },
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* Default settings: everything personal is empty. Each visitor fills it in; the map stores it in their browser only. */
  function defaultSettings() {
    var perLang = function () {
      var r = {};
      LANGS.forEach(function (l) { r[l] = ""; });
      return r;
    };
    return {
      version: 1,
      name: "",
      email: "",
      instrument: perLang(),
      teachingLanguages: [],
      bio: perLang(),
      signature: "",
      cvLink: "",
      templates: clone(DEFAULT_TEMPLATES),
    };
  }

  /* Merge saved or imported settings into the defaults; only known keys and types are kept. */
  function normalizeSettings(input) {
    var d = defaultSettings();
    if (!input || typeof input !== "object") return d;
    var str = function (v, fb) { return typeof v === "string" ? v : fb; };
    d.name = str(input.name, d.name);
    d.email = str(input.email, d.email);
    d.signature = str(input.signature, d.signature);
    d.cvLink = str(input.cvLink, d.cvLink);
    if (Array.isArray(input.teachingLanguages)) d.teachingLanguages = input.teachingLanguages.filter(function (c) { return LANGS.indexOf(c) >= 0; });
    LANGS.forEach(function (l) {
      if (input.instrument && typeof input.instrument === "object") d.instrument[l] = str(input.instrument[l], d.instrument[l]);
      if (input.bio && typeof input.bio === "object") d.bio[l] = str(input.bio[l], d.bio[l]);
      VARIANTS.forEach(function (v) {
        var t = input.templates && input.templates[l] && input.templates[l][v];
        if (t && typeof t === "object") {
          d.templates[l][v].subject = str(t.subject, d.templates[l][v].subject);
          d.templates[l][v].body = str(t.body, d.templates[l][v].body);
        }
      });
    });
    return d;
  }

  /* ---------- templates ---------- */
  function normalizeNewlines(s) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n"); }

  /* Body: a line with an empty placeholder is dropped entirely, then runs of blank lines are collapsed.
   * opts.cvAttached: when there is no CV link, the CV line becomes "attached". */
  function renderBody(tpl, vars, opts) {
    opts = opts || {};
    var out = [];
    normalizeNewlines(tpl).split("\n").forEach(function (line) {
      var empty = false;
      var hasCv = /\{\{\s*cv_link\s*\}\}/.test(line);
      var text = line.replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, function (m, k) {
        var v = vars[k];
        if (v == null || String(v).trim() === "") { empty = true; return ""; }
        return String(v);
      });
      if (empty) {
        if (hasCv && opts.cvAttached && !String(vars.cv_link || "").trim()) out.push(ATTACHED_LINE[opts.lang] || ATTACHED_LINE.de);
        return;
      }
      out.push(text);
    });
    var res = [];
    out.forEach(function (l) {
      var blank = l.trim() === "";
      if (blank && (res.length === 0 || res[res.length - 1].trim() === "")) return;
      res.push(l);
    });
    while (res.length && res[res.length - 1].trim() === "") res.pop();
    return res.join("\n");
  }

  function renderSubject(tpl, vars) {
    var t = normalizeNewlines(tpl).replace(/\n+/g, " ").replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, function (m, k) {
      var v = vars[k];
      return v == null ? "" : String(v).replace(/\s+/g, " ").trim();
    });
    return t.replace(/\s+/g, " ").replace(/\s*[–-]\s*$/, "").replace(/^\s*[–-]\s*/, "").trim();
  }

  function offerVariant(entity) {
    return entity && entity.offer && entity.offer.status === "posted" ? "posted" : "initiative";
  }

  /* Build subject, body and recipient for an entity. opts: {lang, variant, cvAttached} */
  function compose(entity, settings, opts) {
    opts = opts || {};
    var lang = LANGS.indexOf(opts.lang) >= 0 ? opts.lang : LANGS.indexOf(entity.email_language) >= 0 ? entity.email_language : "de";
    var variant = VARIANTS.indexOf(opts.variant) >= 0 ? opts.variant : offerVariant(entity);
    var s = settings || defaultSettings();
    var tpl = (s.templates && s.templates[lang] && s.templates[lang][variant]) || DEFAULT_TEMPLATES[lang][variant];
    var offer = entity.offer || {};
    var contact = entity.contact || {};
    var instrument = (s.instrument && s.instrument[lang]) || "";
    var vars = {
      greeting: greeting(entity, lang),
      entity_name: cleanName(entity.name),
      position_title: offer.status === "posted" ? offer.title || "" : "",
      offer_url: offer.status === "posted" ? offer.url || contact.application_portal || "" : "",
      my_name: s.name || "",
      instrument: instrument,
      languages: languageList(s.teachingLanguages, lang),
      bio: (s.bio && s.bio[lang]) || "",
      cv_link: s.cvLink || "",
      signature: s.signature || "",
      role: rolePhrase(entity, lang, instrument),
    };
    return {
      lang: lang,
      variant: variant,
      to: contact.email || "",
      subject: renderSubject(tpl.subject, vars),
      body: renderBody(tpl.body, vars, { cvAttached: !!opts.cvAttached, lang: lang }),
    };
  }

  /* ---------- mailto: ---------- */
  var MAILTO_LIMIT = 2000;

  function toCRLF(s) { return normalizeNewlines(s).replace(/\n/g, "\r\n"); }

  function buildMailto(to, subject, body) {
    var enc = encodeURIComponent;
    var addr = to ? enc(to).replace(/%40/g, "@") : "";
    var url = "mailto:" + addr + "?subject=" + enc(subject || "") + "&body=" + enc(toCRLF(body || ""));
    return { url: url, length: url.length, tooLong: url.length > MAILTO_LIMIT };
  }

  /* ---------- .eml ---------- */
  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  function utf8(str) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
    var s = unescape(encodeURIComponent(str)), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }

  function base64(bytes) {
    var out = "", i;
    for (i = 0; i + 2 < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
    }
    var rest = bytes.length - i;
    if (rest === 1) {
      var n1 = bytes[i] << 16;
      out += B64[(n1 >> 18) & 63] + B64[(n1 >> 12) & 63] + "==";
    } else if (rest === 2) {
      var n2 = (bytes[i] << 16) | (bytes[i + 1] << 8);
      out += B64[(n2 >> 18) & 63] + B64[(n2 >> 12) & 63] + B64[(n2 >> 6) & 63] + "=";
    }
    return out;
  }

  function wrap76(b64) {
    var lines = [];
    for (var i = 0; i < b64.length; i += 76) lines.push(b64.slice(i, i + 76));
    return lines.join("\r\n");
  }

  /* RFC 2047: non-ASCII text becomes UTF-8/B encoded words of <= 36 bytes (never splitting a character),
   * folded with CRLF + space. */
  function encodeHeaderText(text) {
    var s = String(text == null ? "" : text).replace(/[\r\n]+/g, " ");
    if (/^[\x20-\x7e]*$/.test(s)) return s;
    var words = [], cur = [], curLen = 0;
    var chars = Array.from(s);
    chars.forEach(function (ch) {
      var b = utf8(ch);
      if (curLen + b.length > 36) {
        words.push(cur);
        cur = [];
        curLen = 0;
      }
      for (var i = 0; i < b.length; i++) cur.push(b[i]);
      curLen += b.length;
    });
    if (cur.length) words.push(cur);
    return words.map(function (w) { return "=?UTF-8?B?" + base64(Uint8Array.from(w)) + "?="; }).join("\r\n ");
  }

  function asciiFallback(name) {
    return String(name || "cv.pdf").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  }

  function slugify(str) {
    return String(str || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss").replace(/[Øø]/g, "o")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /* spec: {to, from:{name,email}, subject, body, attachment:{name, type, bytes}, date, boundary}
   * Returns the whole message as an ASCII string with CRLF line ends. */
  function buildEml(spec) {
    var boundary = spec.boundary || "=_bmm_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    var date = spec.date instanceof Date ? spec.date : new Date();
    var h = [];
    h.push("X-Unsent: 1");
    h.push("MIME-Version: 1.0");
    if (spec.from && spec.from.email) {
      var fn = spec.from.name ? encodeHeaderText(spec.from.name) : "";
      if (fn && /^[\x20-\x7e]*$/.test(fn) && /[()<>@,;:\\".\[\]]/.test(fn)) fn = '"' + fn.replace(/(["\\])/g, "\\$1") + '"';
      h.push("From: " + (fn ? fn + " <" + spec.from.email + ">" : spec.from.email));
    }
    if (spec.to) h.push("To: " + spec.to);
    h.push("Subject: " + encodeHeaderText(spec.subject || ""));
    h.push("Date: " + date.toUTCString().replace("GMT", "+0000"));
    var textPart =
      "Content-Type: text/plain; charset=UTF-8\r\n" +
      "Content-Transfer-Encoding: base64\r\n\r\n" +
      wrap76(base64(utf8(toCRLF(spec.body || "")))) + "\r\n";
    var att = spec.attachment;
    h.push('Content-Type: multipart/mixed; boundary="' + boundary + '"');
    var CRLF = "\r\n";
    var body =
      h.join(CRLF) + CRLF + CRLF +
      "This is a multi-part message in MIME format." + CRLF +
      "--" + boundary + CRLF + textPart;
    if (att && att.bytes) {
      var fname = att.name || "cv.pdf";
      var fallback = asciiFallback(fname);
      var disp = 'Content-Disposition: attachment; filename="' + fallback + '"';
      if (fallback !== fname) disp += "; filename*=UTF-8''" + encodeURIComponent(fname).replace(/['()]/g, escape);
      body +=
        "--" + boundary + CRLF +
        "Content-Type: " + (att.type || "application/pdf") + '; name="' + fallback + '"' + CRLF +
        "Content-Transfer-Encoding: base64" + CRLF +
        disp + CRLF + CRLF +
        wrap76(base64(att.bytes)) + CRLF;
    }
    return body + "--" + boundary + "--" + CRLF;
  }

  return {
    LANGS: LANGS,
    LANG_NAMES: LANG_NAMES,
    LANG_NAMES_EN: LANG_NAMES_EN,
    VARIANTS: VARIANTS,
    VARIANT_NAMES: VARIANT_NAMES,
    DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
    MAILTO_LIMIT: MAILTO_LIMIT,
    languageList: languageList,
    cleanName: cleanName,
    greeting: greeting,
    rolePhrase: rolePhrase,
    defaultSettings: defaultSettings,
    normalizeSettings: normalizeSettings,
    renderBody: renderBody,
    renderSubject: renderSubject,
    offerVariant: offerVariant,
    compose: compose,
    buildMailto: buildMailto,
    buildEml: buildEml,
    encodeHeaderText: encodeHeaderText,
    base64: base64,
    utf8: utf8,
    slugify: slugify,
    toCRLF: toCRLF,
  };
});
