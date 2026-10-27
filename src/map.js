/* Berlin Music Map: user interface. Only Leaflet (L) and src/mail.js (BMMMail) are used. The data comes embedded
 * in <script type="application/json"> blocks, which scripts/build_map.py writes. There is no personal data here. */
(function () {
  "use strict";

  var L = window.L;
  var Mail = window.BMMMail;

  /* ====================== utilities ====================== */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function readJSON(id) {
    var n = document.getElementById(id);
    if (!n) return null;
    try { return JSON.parse(n.textContent); } catch (e) { return null; }
  }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") e.className = v;
        else if (k === "text") e.textContent = v;
        else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
        else if (v === true) e.setAttribute(k, "");
        else e.setAttribute(k, v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function safeUrl(u) { return typeof u === "string" && /^https?:\/\//i.test(u) ? u : ""; }
  function safeColor(c) { return typeof c === "string" && /^#[0-9a-f]{3,8}$/i.test(c) ? c : "#666666"; }
  function link(href, text, cls) {
    var u = safeUrl(href);
    if (!u) return document.createTextNode(text || "");
    return h("a", { href: u, target: "_blank", rel: "noopener noreferrer", text: text || u, class: cls || null });
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }
  function lum(hex) {
    var c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
    var r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
    var f = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  function textOn(hex) { return lum(hex) > 0.4 ? "#111111" : "#ffffff"; }
  function tint(hex, k) {
    var c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(function (x) { return x + x; }).join("");
    var out = "#";
    for (var i = 0; i < 3; i++) {
      var v = parseInt(c.slice(i * 2, i * 2 + 2), 16);
      out += ("0" + Math.round(v + (255 - v) * k).toString(16)).slice(-2);
    }
    return out;
  }
  // "S Potsdamer Platz/Voßstr." or "U Hellersdorf [Pos. 6]" are bus stops next to a station: show the station only
  function cleanStation(n) { return String(n).replace(/\s*\[[^\]]*\]/g, "").replace(/\/.*$/, "").trim(); }
  // Lower case without accents or diacritics; ß -> ss; ae/oe/ue -> a/o/u, so "neukolln", "Neukölln" and "Neukoelln" all match
  var DIACRITICS = new RegExp("[" + String.fromCharCode(768) + "-" + String.fromCharCode(879) + "]", "g");
  function fold(s) { return String(s || "").normalize("NFD").replace(DIACRITICS, "").replace(/ß/g, "ss").toLowerCase().replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u"); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }

  /* ====================== browser storage (always inside try/catch) ====================== */
  var KEY_PREFIX = "bmm-";
  var store = {
    get: function (k) {
      try { var v = window.localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    },
    remove: function (k) {
      try { window.localStorage.removeItem(k); return true; } catch (e) { return false; }
    },
  };

  /* CV as PDF: IndexedDB, with an in-memory copy if the browser refuses to store it. */
  var cvStore = (function () {
    var mem = null;
    function open() {
      return new Promise(function (res, rej) {
        try {
          var rq = window.indexedDB.open(KEY_PREFIX + "map", 1);
          rq.onupgradeneeded = function () { rq.result.createObjectStore("files"); };
          rq.onsuccess = function () { res(rq.result); };
          rq.onerror = function () { rej(rq.error); };
          rq.onblocked = function () { rej(new Error("blocked")); };
        } catch (e) { rej(e); }
      });
    }
    function tx(mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          try {
            var t = db.transaction("files", mode);
            var r = fn(t.objectStore("files"));
            t.oncomplete = function () { db.close(); res(r ? r.result : undefined); };
            t.onerror = t.onabort = function () { db.close(); rej(t.error); };
          } catch (e) { try { db.close(); } catch (_) { /* ignore */ } rej(e); }
        });
      });
    }
    return {
      get: function () { return tx("readonly", function (s) { return s.get("cv"); }).then(function (v) { return v || mem; }, function () { return mem; }); },
      put: function (rec) { mem = rec; return tx("readwrite", function (s) { return s.put(rec, "cv"); }).then(function () { return true; }, function () { rec.volatile = true; return false; }); },
      del: function () { mem = null; return tx("readwrite", function (s) { return s["delete"]("cv"); }).then(function () { return true; }, function () { return false; }); },
    };
  })();

  /* ====================== data ====================== */
  var CATS = readJSON("data-categories") || [];
  var INSTR = readJSON("data-instruments") || [];
  var JOBS = readJSON("data-jobs") || [];
  var DISTRICTS = readJSON("data-districts");
  var TRANSIT = readJSON("data-transit");
  var META = readJSON("data-meta") || {};

  var catById = {};
  CATS.forEach(function (c) { catById[c.id] = c; });
  var instrById = {};
  INSTR.forEach(function (f) { instrById[f.id] = f; });

  // Display names of the layers; an unknown layer id falls back to the id itself
  var LAYER_NAMES = { teaching_music: "Teaching · Music", singing: "Singing & choirs" };
  var LAYERS = [];
  CATS.forEach(function (c) {
    if (!LAYERS.some(function (l) { return l.id === c.layer; })) LAYERS.push({ id: c.layer, name: LAYER_NAMES[c.layer] || c.layer });
  });
  LAYERS.forEach(function (l) { l.cats = CATS.filter(function (c) { return c.layer === l.id; }); });

  var CONTRACTS = [
    { code: "A", type: "employment", label: "Employment", short: "Employment" },
    { code: "H", type: "honorar_hourly", label: "Hourly fee (Honorar)", short: "Hourly fee" },
    { code: "C", type: "honorar_commission", label: "Commission or room rent", short: "Commission or rent" },
    { code: "F", type: "freelance_project", label: "Freelance project", short: "Freelance" },
    { code: "M", type: "mixed", label: "Mixed", short: "Mixed" },
    { code: "?", type: "unknown", label: "Unknown", short: "Unknown" },
  ];
  var contractByType = {};
  CONTRACTS.forEach(function (c) { contractByType[c.type] = c; });
  function contractOf(d) { return contractByType[(d.contract && d.contract.type) || "unknown"] || contractByType.unknown; }

  var OFFER_STATES = [
    { key: "posted", label: "Open job ad" },
    { key: "initiative_welcome", label: "Invites applications" },
    { key: "none_found", label: "No ad found" },
  ];
  var LANG_OPTIONS = [["de", "German"], ["en", "English"], ["es", "Spanish"], ["it", "Italian"]];
  var DISTRICT_NAMES = [
    "Mitte", "Friedrichshain-Kreuzberg", "Pankow", "Charlottenburg-Wilmersdorf", "Spandau", "Steglitz-Zehlendorf",
    "Tempelhof-Schöneberg", "Neukölln", "Treptow-Köpenick", "Marzahn-Hellersdorf", "Lichtenberg", "Reinickendorf",
  ];

  /* ====================== state ====================== */
  var VIEW_KEY = KEY_PREFIX + "view.v1";
  var SETTINGS_KEY = KEY_PREFIX + "settings.v1";
  var view = {
    catsOff: {},
    instr: {}, // selected instrument families; none selected = no instrument filter
    transit: { U: true, S: true, tram: false, bus: false },
    boundaries: false,
    base: "light",
    contract: {},
    offer: {},
    muni: false,
    district: "",
  };
  CONTRACTS.forEach(function (c) { view.contract[c.code] = true; });
  OFFER_STATES.forEach(function (o) { view.offer[o.key] = true; });
  (function loadView() {
    var s = store.get(VIEW_KEY);
    if (!s || typeof s !== "object") return;
    if (s.catsOff && typeof s.catsOff === "object") Object.keys(s.catsOff).forEach(function (k) { if (catById[k] && s.catsOff[k]) view.catsOff[k] = true; });
    if (s.instr && typeof s.instr === "object") Object.keys(s.instr).forEach(function (k) { if (instrById[k] && s.instr[k]) view.instr[k] = true; });
    if (s.transit) ["U", "S", "tram", "bus"].forEach(function (k) { if (typeof s.transit[k] === "boolean") view.transit[k] = s.transit[k]; });
    if (typeof s.boundaries === "boolean") view.boundaries = s.boundaries;
    if (s.base === "osm" || s.base === "light") view.base = s.base;
    if (s.contract) CONTRACTS.forEach(function (c) { if (typeof s.contract[c.code] === "boolean") view.contract[c.code] = s.contract[c.code]; });
    if (s.offer) OFFER_STATES.forEach(function (o) { if (typeof s.offer[o.key] === "boolean") view.offer[o.key] = s.offer[o.key]; });
    if (typeof s.muni === "boolean") view.muni = s.muni;
    if (DISTRICT_NAMES.indexOf(s.district) >= 0) view.district = s.district;
  })();
  function saveView() { store.set(VIEW_KEY, view); }
  var query = "";

  var settings = Mail.normalizeSettings(store.get(SETTINGS_KEY));
  var settingsDirty = false;
  var flushSettings = function () { if (settingsDirty) { settingsDirty = false; store.set(SETTINGS_KEY, settings); } };
  var saveSettings = (function () { var d = debounce(flushSettings, 300); return function () { settingsDirty = true; d(); }; })();
  window.addEventListener("pagehide", flushSettings);

  /* ====================== entities ====================== */
  var counts = {};
  var instrCounts = {};
  var entities = JOBS.map(function (d) {
    var c = catById[d.category] || { id: d.category, label_en: d.category, color: "#666666", municipal: false };
    var color = safeColor(c.color);
    var ct = contractOf(d);
    var fams = (d.instruments || []).filter(function (id) { return !!instrById[id]; });
    var parts = [
      d.name, d.district, d.address && d.address.street, d.address && d.address.postcode, d.summary_en, c.id, c.label_en,
      d.offer && d.offer.title,
      fams.map(function (id) { return id + " " + instrById[id].label_en; }).join(" "),
      (d.instruments_detail || []).join(" "),
      (d.sites || []).map(function (s) { return s.name + " " + (s.street || ""); }).join(" "),
    ];
    counts[c.id] = (counts[c.id] || 0) + 1;
    fams.forEach(function (id) { instrCounts[id] = (instrCounts[id] || 0) + 1; });
    return {
      d: d, cat: c, color: color, fg: textOn(color), letter: ct.code, contract: ct, fams: fams,
      muni: !!c.municipal, approx: !!(d.geo && d.geo.precision === "postcode"),
      text: fold(parts.filter(Boolean).join(" ")), visible: false, marker: null, sats: [],
    };
  });

  function selectedFamilies() { return Object.keys(view.instr).filter(function (k) { return view.instr[k]; }); }

  function entityVisible(e) {
    var d = e.d;
    if (view.catsOff[d.category]) return false;
    if (!view.contract[e.letter]) return false;
    if (!view.offer[(d.offer && d.offer.status) || "none_found"]) return false;
    if (view.muni && !e.muni) return false;
    if (view.district && d.district !== view.district) return false;
    var sel = selectedFamilies();
    if (sel.length && !sel.some(function (id) { return e.fams.indexOf(id) >= 0; })) return false;
    if (query) {
      var toks = query.split(/\s+/);
      for (var i = 0; i < toks.length; i++) if (e.text.indexOf(toks[i]) < 0) return false;
    }
    return true;
  }

  /* ====================== map ====================== */
  var map = L.map("map", { zoomControl: false, minZoom: 9, maxZoom: 19, zoomSnap: 0.5, center: [52.52, 13.405], zoom: 11, keyboard: true });
  L.control.zoom({ position: "bottomright" }).addTo(map);

  // CARTO Positron no longer serves tiles without an API key, so the default is Esri's light grey (base + labels),
  // with standard OpenStreetMap as the alternative.
  var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
  var BASES = {
    light: {
      name: "Light grey (Esri)",
      layers: [
        { url: ESRI + "World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", opt: { maxNativeZoom: 16, maxZoom: 19, attribution: 'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Esri, DeLorme, NAVTEQ' } },
        { url: ESRI + "World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}", opt: { maxNativeZoom: 16, maxZoom: 19 } },
      ],
    },
    osm: {
      name: "OpenStreetMap standard",
      layers: [{ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", opt: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } }],
    },
  };
  var baseLayers = [];
  var tileWarned = false;
  var tileErrors = [];
  // Warn only when many tiles fail in a row (8 or more within 10 s), not for a single failure
  function tileFailed() {
    var now = Date.now();
    tileErrors.push(now);
    tileErrors = tileErrors.filter(function (t) { return now - t < 10000; });
    if (tileWarned || tileErrors.length < 8) return;
    tileWarned = true;
    toast("Map tiles are not loading. You may be offline, or the tile server is refusing requests. Pins, lines and panels still work.",
      view.base === "osm" ? null : { text: "Switch to OpenStreetMap", run: function () { setBase("osm"); tileWarned = false; tileErrors = []; } }, 15000);
  }
  function setBase(key) {
    if (!BASES[key]) key = "light";
    view.base = key;
    baseLayers.forEach(function (l) { map.removeLayer(l); });
    baseLayers = BASES[key].layers.map(function (def) {
      var tl = L.tileLayer(def.url, def.opt);
      tl.on("tileerror", tileFailed);
      tl.addTo(map);
      return tl;
    });
    $$("input[data-base]").forEach(function (r) { r.checked = r.getAttribute("data-base") === key; });
    saveView();
  }

  map.createPane("transit").style.zIndex = 420;
  map.createPane("stations").style.zIndex = 430;

  /* ---------- pins ---------- */
  var pinsLayer = L.layerGroup().addTo(map);
  var coincident = {};
  entities.forEach(function (e) {
    var k = e.d.geo.lat.toFixed(5) + "," + e.d.geo.lng.toFixed(5);
    (coincident[k] = coincident[k] || []).push(e);
  });
  // Pins that share a coordinate are spread 36 px apart on screen
  Object.keys(coincident).forEach(function (k) {
    var g = coincident[k];
    g.forEach(function (e, i) { e.dx = (i - (g.length - 1) / 2) * 36; });
  });

  function pinSize(e) { return e.muni ? 38 : 30; }
  function pinIcon(e) {
    var S = pinSize(e);
    var status = e.d.offer && e.d.offer.status;
    var solid = status === "posted";
    var style = "--c:" + e.color + ";--bg:" + (solid ? e.color : "#ffffff") + ";--fg:" + (solid ? e.fg : "#1f2933") + ";--s:" + S + "px";
    var html =
      '<div class="pin-box" style="--s:' + S + 'px"><div class="pin' + (e.muni ? " muni" : "") + (e.approx ? " approx" : "") + '" style="' + style + '"><span class="pl">' +
      e.letter + "</span></div>" +
      (status === "initiative_welcome" ? '<span class="pin-star" aria-hidden="true">★</span>' : "") + "</div>";
    var dx = e.dx || 0;
    return L.divIcon({
      className: "pin-wrap", html: html, iconSize: [S, S],
      iconAnchor: [S / 2 - dx, Math.round(S * 1.207)], popupAnchor: [dx, -Math.round(S * 1.207) - 2], tooltipAnchor: [dx, -Math.round(S * 1.207)],
    });
  }
  function satIcon(e) {
    var html = '<div class="sat" style="--c:' + e.color + ";--bg:" + tint(e.color, 0.7) + '"></div>';
    return L.divIcon({ className: "sat-wrap", html: html, iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -9], tooltipAnchor: [0, -8] });
  }
  // Maximum popup height follows the real map height (a narrow window leaves little room); the rest scrolls inside
  function popupMaxHeight() { return Math.max(160, map.getSize().y - 110); }
  map.on("popupopen", function (ev) {
    var p = ev.popup;
    if (p && p.options) { p.options.maxHeight = popupMaxHeight(); p.options.maxWidth = Math.min(340, Math.max(220, map.getSize().x - 60)); p.update(); }
  });
  function popupOptions() {
    return { maxWidth: Math.min(340, Math.max(240, window.innerWidth - 70)), minWidth: 220, maxHeight: popupMaxHeight(), autoPanPadding: [16, 16] };
  }
  function ariaFor(marker, label) {
    marker.on("add", function () {
      var el = marker.getElement && marker.getElement();
      if (el) el.setAttribute("aria-label", label);
    });
  }

  entities.forEach(function (e) {
    var d = e.d;
    var m = L.marker([d.geo.lat, d.geo.lng], { icon: pinIcon(e), keyboard: true, riseOnHover: true, zIndexOffset: (d.offer.status === "posted" ? 1000 : 0) + (e.muni ? 300 : 0) });
    m.bindPopup(function () { return buildCard(e, { popup: true }); }, popupOptions());
    m.bindTooltip(d.name, { direction: "top", opacity: 0.95 });
    ariaFor(m, e.cat.label_en + ": " + d.name + ", contract type " + e.contract.short);
    e.marker = m;
    (d.sites || []).forEach(function (s) {
      if (!s.geo) return;
      var sm = L.marker([s.geo.lat, s.geo.lng], { icon: satIcon(e), keyboard: true, zIndexOffset: -500 });
      sm.bindPopup(function () { return buildCard(e, { popup: true, site: s }); }, popupOptions());
      sm.bindTooltip((s.name || "Branch") + " (branch of " + d.name + ")", { direction: "top", opacity: 0.95 });
      ariaFor(sm, "Branch " + (s.name || "") + " of " + d.name);
      e.sats.push(sm);
    });
  });

  /* ---------- filters -> pins ---------- */
  var onMap = new Set();
  function applyFilters() {
    var n = 0;
    entities.forEach(function (e) {
      var v = entityVisible(e);
      e.visible = v;
      if (v) n++;
      var all = [e.marker].concat(e.sats);
      all.forEach(function (m) {
        if (v && !onMap.has(m)) { pinsLayer.addLayer(m); onMap.add(m); }
        else if (!v && onMap.has(m)) { pinsLayer.removeLayer(m); onMap.delete(m); }
      });
    });
    var c = $("#count");
    clear(c);
    c.appendChild(h("b", { text: String(n) }));
    c.appendChild(document.createTextNode(" of " + entities.length + " places"));
    syncCatUI();
    saveView();
  }

  /* ---------- category switches ---------- */
  function setCat(id, on) {
    if (on) delete view.catsOff[id]; else view.catsOff[id] = true;
    applyFilters();
  }
  function setLayerCats(layer, on) {
    layer.cats.forEach(function (c) { if (on) delete view.catsOff[c.id]; else view.catsOff[c.id] = true; });
    applyFilters();
  }
  function setOnly(id) {
    CATS.forEach(function (c) { if (c.id === id) delete view.catsOff[c.id]; else view.catsOff[c.id] = true; });
    applyFilters();
  }
  function showAll() {
    view.catsOff = {};
    applyFilters();
  }
  function hideAll() {
    CATS.forEach(function (c) { view.catsOff[c.id] = true; });
    applyFilters();
  }
  function syncCatUI() {
    $$("input[data-cat]").forEach(function (cb) { cb.checked = !view.catsOff[cb.getAttribute("data-cat")]; });
    $$("[data-row]").forEach(function (r) { r.classList.toggle("off", !!view.catsOff[r.getAttribute("data-row")]); });
    $$("input[data-layer]").forEach(function (cb) {
      var layer = LAYERS.filter(function (l) { return l.id === cb.getAttribute("data-layer"); })[0];
      var on = layer.cats.filter(function (c) { return !view.catsOff[c.id]; }).length;
      cb.checked = on === layer.cats.length;
      cb.indeterminate = on > 0 && on < layer.cats.length;
    });
  }

  /* ---------- public transport ---------- */
  var transitGroups = { U: L.layerGroup(), S: L.layerGroup(), tram: L.layerGroup(), bus: L.layerGroup() };
  var stationLayer = L.layerGroup();
  var stationItems = [];
  var transitLines = [];
  var lineColors = { U: [], S: [] };
  var transitCounts = { U: 0, S: 0, tram: 0, bus: 0 };
  var BASE_W = { U: 4.5, S: 4, tram: 2.6, bus: 1.2, metro: 2.4 };
  function zoomFactor(z) { return z <= 10 ? 0.55 : z <= 11.5 ? 0.75 : z >= 15 ? 1.4 : z >= 13.5 ? 1.15 : 1; }
  var stationPoints = [];
  (function buildTransit() {
    if (!TRANSIT || !TRANSIT.features) return;
    var rLines = L.canvas({ pane: "transit", padding: 0.4, tolerance: 4 });
    var rStations = L.canvas({ pane: "stations", padding: 0.2 });
    var seenLine = {};
    TRANSIT.features.forEach(function (f) {
      var p = f.properties;
      if (p.mode === "station") {
        var hasU = p.lines.some(function (x) { return /^U/.test(x); });
        var hasS = p.lines.some(function (x) { return /^S/.test(x); });
        var kind = hasU && hasS ? "S+U" : hasU ? "U" : "S";
        var ll = [f.geometry.coordinates[1], f.geometry.coordinates[0]];
        stationPoints.push({ ll: ll, name: kind + " " + p.name, closedOnly: !!(p.closed && p.closed.length === p.lines.length) });
        var cm = L.circleMarker(ll, { renderer: rStations, radius: 3.6, weight: 1.6, color: "#2b2f33", fillColor: "#ffffff", fillOpacity: 1, interactive: true });
        var closedNote = p.closed && p.closed.length ? " (" + p.closed.join(", ") + ": no trains in the timetable data, replaced by buses)" : "";
        cm.bindTooltip(kind + " " + p.name + " · " + p.lines.join(" ") + closedNote, { direction: "top", className: "stn", offset: [0, -4] });
        stationItems.push({ layer: cm, hasU: hasU, hasS: hasS });
        return;
      }
      var mode = p.mode;
      var base = mode === "bus" && p.metro ? BASE_W.metro : BASE_W[mode];
      var coords = f.geometry.coordinates.map(function (part) { return part.map(function (c) { return [c[1], c[0]]; }); });
      var pl = L.polyline(coords, {
        renderer: rLines, color: p.color, weight: base, opacity: 0.6, lineCap: "round", lineJoin: "round", smoothFactor: 1,
        dashArray: p.closed ? "5 8" : null, interactive: true,
      });
      var label = (mode === "bus" ? "Bus " : mode === "tram" ? "Tram " : "") + p.name + (p.closed ? " (closed section: replaced by buses)" : "");
      pl.bindTooltip(label, { sticky: true, direction: "top", className: "stn" });
      pl._bmmBase = base;
      transitLines.push(pl);
      transitGroups[mode].addLayer(pl);
      var key = mode + p.name + (p.closed ? "c" : "");
      if (!seenLine[key]) {
        seenLine[key] = true;
        if (!p.closed) transitCounts[mode]++;
        if (mode === "U" || mode === "S") { if (!p.closed) lineColors[mode].push({ name: p.name, color: p.color }); }
      }
    });
  })();
  function nearestStation(lat, lng) {
    var best = null;
    var kx = Math.cos((lat * Math.PI) / 180) * 111320;
    stationPoints.forEach(function (s) {
      if (s.closedOnly) return;
      var d = Math.hypot((s.ll[1] - lng) * kx, (s.ll[0] - lat) * 111320);
      if (!best || d < best.d) best = { d: d, name: s.name };
    });
    return best ? { name: best.name, distance_m: Math.round(best.d * 1.25) } : null;
  }
  function updateTransitWeights() {
    var k = zoomFactor(map.getZoom());
    transitLines.forEach(function (pl) { pl.setStyle({ weight: pl._bmmBase * k }); });
  }
  function updateStations() {
    stationLayer.clearLayers();
    if (map.getZoom() < 13) return;
    stationItems.forEach(function (s) {
      if ((s.hasU && view.transit.U) || (s.hasS && view.transit.S)) stationLayer.addLayer(s.layer);
    });
  }
  function setTransit(mode, on) {
    view.transit[mode] = on;
    if (on) map.addLayer(transitGroups[mode]); else map.removeLayer(transitGroups[mode]);
    ["bus", "tram", "S", "U"].forEach(function (m) { if (view.transit[m]) transitGroups[m].eachLayer(function (l) { l.bringToFront(); }); });
    updateStations();
    $$("input[data-transit]").forEach(function (cb) { cb.checked = !!view.transit[cb.getAttribute("data-transit")]; });
    saveView();
  }
  stationLayer.addTo(map);
  // Pins shrink when zooming out (CSS: --k on the map container)
  function setPinScale() {
    var z = map.getZoom(), el = map.getContainer();
    ["pz-1", "pz-2", "pz-3"].forEach(function (c) { el.classList.remove(c); });
    if (z <= 10.5) el.classList.add("pz-1"); else if (z <= 11.5) el.classList.add("pz-2"); else if (z <= 12.5) el.classList.add("pz-3");
  }
  map.on("zoomend", function () { updateTransitWeights(); updateStations(); setPinScale(); });

  /* ---------- district boundaries ---------- */
  var boundaryLayer = L.layerGroup();
  (function buildBoundaries() {
    if (!DISTRICTS || !DISTRICTS.features) return;
    var gj = L.geoJSON(DISTRICTS, { style: { color: "#4a5560", weight: 1.6, dashArray: "6 5", fill: false, opacity: 0.85 }, interactive: false });
    boundaryLayer.addLayer(gj);
    DISTRICTS.features.forEach(function (f) {
      var polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      var biggest = polys.slice().sort(function (a, b) { return b[0].length - a[0].length; })[0][0];
      var lat = 0, lng = 0;
      biggest.forEach(function (c) { lng += c[0]; lat += c[1]; });
      lat /= biggest.length; lng /= biggest.length;
      boundaryLayer.addLayer(L.marker([lat, lng], {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: "bez-label", html: f.properties.name, iconSize: [0, 0] }),
      }));
    });
  })();
  function setBoundaries(on) {
    view.boundaries = on;
    if (on) map.addLayer(boundaryLayer); else map.removeLayer(boundaryLayer);
    $$("input[data-boundaries]").forEach(function (cb) { cb.checked = on; });
    saveView();
  }

  /* ====================== notices and dialogs ====================== */
  var toastTimer = null;
  function toast(msg, action, ms) {
    var t = clear($("#toast"));
    t.appendChild(document.createTextNode(msg));
    if (action) {
      t.appendChild(document.createTextNode(" "));
      t.appendChild(h("button", { type: "button", class: "btn small", text: action.text, onclick: function () { t.hidden = true; action.run(); } }));
    }
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 6500);
  }
  var dialogReturn = null;
  function closeDialog() {
    $("#dialog-back").hidden = true;
    clear($("#dialog"));
    if (dialogReturn && dialogReturn.focus) { try { dialogReturn.focus(); } catch (e) { /* ignore */ } }
    dialogReturn = null;
  }
  function openDialog(title, bodyNodes, buttons) {
    var dlg = $("#dialog");
    clear(dlg);
    dialogReturn = document.activeElement;
    dlg.appendChild(h("h2", { id: "dialog-title", text: title }));
    bodyNodes.forEach(function (n) { dlg.appendChild(n); });
    var act = h("div", { class: "actions" });
    buttons.forEach(function (b) {
      act.appendChild(h("button", { type: "button", class: "btn" + (b.primary ? " primary" : ""), text: b.text, onclick: function () { if (b.keep !== true) closeDialog(); if (b.run) b.run(); } }));
    });
    dlg.appendChild(act);
    $("#dialog-back").hidden = false;
    var first = $("button", act);
    if (first) first.focus();
  }
  $("#dialog-back").addEventListener("mousedown", function (ev) { if (ev.target === this) closeDialog(); });

  function copyText(text) {
    var done = "Subject and text copied to the clipboard.";
    function fallback() {
      try {
        var ta = h("textarea", { "aria-hidden": "true", style: "position:fixed;left:-9999px;top:0" });
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }
    function manual() {
      var ta = h("textarea", { readonly: true, "aria-label": "Text to copy" });
      ta.value = text;
      openDialog("Copy this text", [h("p", { class: "hint", text: "Your browser blocked automatic copying. Select the text below and copy it yourself." }), ta], [{ text: "Close" }]);
      ta.focus(); ta.select();
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast(done); }, function () { if (fallback()) toast(done); else manual(); });
        return;
      }
    } catch (e) { /* fall through */ }
    if (fallback()) toast(done); else manual();
  }
  function plainMessage(msg) {
    return (msg.to ? "To: " + msg.to + "\n" : "") + "Subject: " + msg.subject + "\n\n" + msg.body;
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = h("a", { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  /* ====================== email from the card ====================== */
  function downloadEml(e, lang) {
    cvStore.get().then(function (rec) {
      var attach = rec && rec.data ? { name: rec.name || "cv.pdf", type: rec.type || "application/pdf", bytes: new Uint8Array(rec.data) } : null;
      var msg = Mail.compose(e.d, settings, { lang: lang, cvAttached: !!attach });
      var eml = Mail.buildEml({ to: msg.to, from: { name: settings.name, email: settings.email }, subject: msg.subject, body: msg.body, attachment: attach });
      downloadBlob(new Blob([eml], { type: "message/rfc822" }), "email-" + Mail.slugify(e.d.id) + ".eml");
      toast(attach
        ? "Draft downloaded (.eml) with your CV attached. Open it in your mail app; in Thunderbird, choose “Edit as New”."
        : "Draft downloaded (.eml) without an attachment. To attach your CV, choose a PDF in Settings first.");
    });
  }
  function longMailDialog(e, lang, mailto) {
    var msg = Mail.compose(e.d, settings, { lang: lang });
    openDialog(
      "This email link is long",
      [h("p", { text: "The link has " + mailto.length + " characters once encoded. Some mail apps, especially on Windows, cut off links longer than about " + Mail.MAILTO_LIMIT + " characters, so the text could be truncated." }),
       h("p", { class: "hint", text: "Safer options: copy the text into a new email, or download the .eml draft." })],
      [
        { text: "Copy text", primary: true, run: function () { copyText(plainMessage(msg)); } },
        { text: "Download .eml", run: function () { downloadEml(e, lang); } },
        { text: "Open anyway", run: function () { window.location.href = mailto.url; } },
        { text: "Cancel" },
      ]
    );
  }

  /* ====================== tip before the mail app opens (can be switched off) ====================== */
  var MAIL_TIP_KEY = KEY_PREFIX + "mail-tip-off";
  function mailTipDialog(e, lang, mailto) {
    var hasLink = !!(settings.cvLink && String(settings.cvLink).trim());
    var skip = h("input", { type: "checkbox", id: "mail-tip-skip" });
    var go = function () {
      if (skip.checked) store.set(MAIL_TIP_KEY, true);
      window.location.href = mailto.url;
    };
    openDialog(
      "Before your email opens",
      [h("p", { text: "Your mail app will open a new draft with the recipient, subject and text already filled in." }),
       h("ul", { class: "tip-list" }, [
         h("li", { text: hasLink
           ? "Your CV link is included in the text."
           : "No CV link is set, so the text does not mention your CV. You can add one in Settings, under “Link to your CV”." }),
         h("li", { text: "An email link cannot attach files. Attach your CV PDF by hand, or use “Email + CV (.eml)” to get a draft with the PDF already attached." }),
         h("li", { text: "You can edit your name, signature, languages and message texts in Settings (top bar)." })]),
       h("label", { class: "check", for: "mail-tip-skip" }, [skip, document.createTextNode(" Don’t show this again")])],
      [
        { text: "Open email", primary: true, run: go },
        { text: "Open Settings", run: function () { setPanel("settings", true); } },
        { text: "Cancel" },
      ]
    );
  }

  /* ====================== card (popup) ====================== */
  function row(dl, label, node) {
    if (node == null || node === "") return;
    dl.appendChild(h("dt", { text: label }));
    dl.appendChild(h("dd", null, [typeof node === "string" ? document.createTextNode(node) : node]));
  }
  function statusPill(d) {
    var s = (d.offer && d.offer.status) || "none_found";
    if (s === "posted") return h("span", { class: "status posted", text: "Open job ad" });
    if (s === "initiative_welcome") return h("span", { class: "status initiative", text: "★ Invites applications" });
    return h("span", { class: "status none", text: "No ad found · you can still apply" });
  }

  function buildCard(e, ctx) {
    ctx = ctx || {};
    var d = e.d, site = ctx.site;
    var c = d.contact || {}, o = d.offer || {}, k = d.conditions || {};
    var root = h("div", { class: "card" });
    root.appendChild(h("div", { class: "cat-line" }, [
      h("span", { class: "chip", style: "background:" + e.color }),
      h("span", { text: e.cat.id + " · " + e.cat.label_en }),
    ]));
    root.appendChild(h("h3", { text: site ? site.name || "Branch" : d.name }));
    if (site) root.appendChild(h("div", { class: "sub", text: "Branch of " + d.name }));
    var addr;
    if (site) addr = d.district + " · " + [site.street, (site.postcode || "") + " Berlin"].filter(Boolean).join(", ");
    else addr = d.district + " · " + d.address.street + ", " + d.address.postcode + " " + d.address.city;
    root.appendChild(h("div", { class: "sub", text: addr }));
    root.appendChild(statusPill(d));
    if (d.secondary_categories && d.secondary_categories.length) {
      root.appendChild(h("div", { class: "sub", text: "Also: " + d.secondary_categories.map(function (id) { return id + " · " + (catById[id] ? catById[id].label_en : id); }).join("; ") }));
    }
    if (site) {
      if (site.geo && site.geo.precision === "postcode") root.appendChild(h("div", { class: "note info", text: "Approximate location (postcode only)." }));
    } else if (e.approx) {
      root.appendChild(h("div", { class: "note info", text: "Approximate location (postcode only)." }));
    }

    var dl = h("dl");
    var ns = site && site.geo ? nearestStation(site.geo.lat, site.geo.lng) : d.nearest_station;
    if (ns && ns.name) {
      var min = Math.max(1, Math.round(ns.distance_m / 80));
      row(dl, "Nearest station", cleanStation(ns.name) + " · about " + ns.distance_m + " m on foot (~" + min + " min)");
    }
    // instruments
    if (e.fams.length || (d.instruments_detail && d.instruments_detail.length)) {
      var inode = h("span", null, [document.createTextNode(e.fams.map(function (id) { return instrById[id].label_en; }).join(", "))]);
      if (d.instruments_detail && d.instruments_detail.length) {
        if (e.fams.length) inode.appendChild(document.createElement("br"));
        inode.appendChild(h("span", { class: "sub", text: d.instruments_detail.join(", ") }));
      }
      row(dl, "Instruments", inode);
    }
    // job ad
    var offerNode = null;
    if (o.title) {
      offerNode = h("span", null, [o.url ? link(o.url, o.title) : document.createTextNode(o.title)]);
    } else if (o.url) {
      offerNode = link(o.url, hostOf(o.url));
    }
    if (offerNode) row(dl, "Job ad", offerNode);
    if (o.deadline) {
      var expired = o.deadline < today();
      row(dl, "Deadline", h("span", { class: expired ? "expired" : null, text: o.deadline + (expired ? " (expired)" : "") }));
    }
    if (o.published) row(dl, "Published", o.published);
    // contract
    var ct = e.contract;
    var ctNode = h("span", null, [h("b", { text: ct.code }), document.createTextNode(" " + ct.label)]);
    var ev = d.contract && d.contract.evidence;
    if (ev) {
      ctNode.appendChild(document.createElement("br"));
      ctNode.appendChild(h("i", { text: "“" + ev + "”" + (d.contract.is_guess ? " (assumed)" : "") }));
    }
    row(dl, "Contract", ctNode);
    // conditions
    if (k.pay) row(dl, "Pay", k.pay + (k.pay_unit ? " (" + k.pay_unit + ")" : ""));
    if (k.hours) row(dl, "Hours", k.hours);
    if (k.requirements) row(dl, "Requirements", k.requirements);
    if (k.german_level) row(dl, "German level", k.german_level);
    // contact
    if (c.website) row(dl, "Website", link(c.website, hostOf(c.website)));
    if (c.phone) row(dl, "Phone", h("a", { href: "tel:" + c.phone.replace(/[^+\d]/g, ""), text: c.phone }));
    if (c.email) {
      var en = h("span", null, [document.createTextNode(c.email)]);
      if (safeUrl(c.email_source_url)) { en.appendChild(document.createTextNode(" · ")); en.appendChild(link(c.email_source_url, "source")); }
      row(dl, "Email", en);
      if (c.email_obfuscated) en.appendChild(h("div", { class: "sub", text: "This address is only shown in obfuscated form on the website. Check it before you send anything." }));
    } else {
      row(dl, "Email", h("span", { class: "sub", text: "not published" }));
    }
    if (c.application_portal) row(dl, "Application portal", link(c.application_portal, hostOf(c.application_portal)));
    // branches (main card only): all of them, including those without coordinates
    if (!site && d.sites && d.sites.length) {
      var ul = h("ul", { class: "branches" }, d.sites.map(function (s) {
        return h("li", { text: s.name + (s.street ? ", " + s.street : "") + (s.postcode ? ", " + s.postcode : "") });
      }));
      row(dl, "Branches", ul);
    }
    root.appendChild(dl);
    if (d.summary_en) root.appendChild(h("p", { class: "summary", text: d.summary_en }));

    // email language
    var lang = Mail.LANGS.indexOf(d.email_language) >= 0 ? d.email_language : "de";
    var sel = h("select", { "aria-label": "Email language" }, Mail.LANGS.map(function (l) {
      return h("option", { value: l, selected: l === lang ? true : null, text: Mail.LANG_NAMES[l] });
    }));
    sel.addEventListener("change", function () { lang = sel.value; refreshMailto(); });
    root.appendChild(h("label", { class: "langpick" }, [document.createTextNode("Email language "), sel]));

    // buttons
    var act = h("div", { class: "actions" });
    var emailBtn;
    function refreshMailto() {
      if (!c.email) return;
      var msg = Mail.compose(d, settings, { lang: lang });
      emailBtn.href = Mail.buildMailto(msg.to, msg.subject, msg.body).url;
    }
    if (c.email) {
      emailBtn = h("a", { class: "btn primary", href: "#", text: "Email", title: "Open a draft in your mail app (no attachment; the CV goes in as a link)" });
      emailBtn.addEventListener("click", function (ev) {
        var msg = Mail.compose(d, settings, { lang: lang });
        var m = Mail.buildMailto(msg.to, msg.subject, msg.body);
        if (m.tooLong) { ev.preventDefault(); longMailDialog(e, lang, m); return; }
        emailBtn.href = m.url;
        if (!store.get(MAIL_TIP_KEY)) { ev.preventDefault(); mailTipDialog(e, lang, m); }
      });
      refreshMailto();
    } else {
      emailBtn = h("span", { class: "btn", "aria-disabled": "true", title: "No email address is published for this place", text: "Email" });
    }
    act.appendChild(emailBtn);
    act.appendChild(h("button", { type: "button", class: "btn", text: "Email + CV (.eml)", title: "Download a draft with your CV PDF attached", onclick: function () { downloadEml(e, lang); } }));
    act.appendChild(h("button", { type: "button", class: "btn", text: "Copy text", onclick: function () { copyText(plainMessage(Mail.compose(d, settings, { lang: lang }))); } }));
    if (safeUrl(c.application_portal)) act.appendChild(h("a", { class: "btn", href: c.application_portal, target: "_blank", rel: "noopener noreferrer", text: "Apply via portal" }));
    var pt = site && site.geo ? site.geo : d.geo;
    if (pt) {
      act.appendChild(h("a", { class: "btn", target: "_blank", rel: "noopener noreferrer", text: "Directions", title: "Route in OpenStreetMap",
        href: "https://www.openstreetmap.org/directions?route=%3B" + pt.lat + "%2C" + pt.lng }));
      act.appendChild(h("a", { class: "btn", target: "_blank", rel: "noopener noreferrer", text: "Google Maps", title: "Public-transport route in Google Maps",
        href: "https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=" + pt.lat + "," + pt.lng }));
    }
    var srcList = null;
    var srcBtn = h("button", { type: "button", class: "btn", text: "Sources", "aria-expanded": "false" });
    srcBtn.addEventListener("click", function () {
      var open = srcBtn.getAttribute("aria-expanded") === "true";
      srcBtn.setAttribute("aria-expanded", open ? "false" : "true");
      srcList.hidden = open;
    });
    act.appendChild(srcBtn);
    root.appendChild(act);
    var urls = [];
    function addUrl(u, label) { if (safeUrl(u) && !urls.some(function (x) { return x.u === u; })) urls.push({ u: u, label: label }); }
    addUrl(o.url, "Job ad");
    addUrl(c.email_source_url, "Email source");
    (d.sources || []).forEach(function (u) { addUrl(u, ""); });
    srcList = h("ul", { class: "sources", hidden: true }, urls.map(function (x) {
      return h("li", null, [x.label ? document.createTextNode(x.label + ": ") : null, link(x.u, x.u.replace(/^https?:\/\/(www\.)?/, ""))]);
    }));
    if (!urls.length) srcList.appendChild(h("li", { text: "No source URLs recorded." }));
    root.appendChild(srcList);
    root.appendChild(h("div", { class: "verified", text: "Last verified " + (d.last_verified || "n/a") + (o.checked ? " · job ad checked " + o.checked : "") }));
    return root;
  }

  /* ====================== panels ====================== */
  var PANELS = ["layers", "filters", "legend", "settings"];
  var narrow = window.matchMedia("(max-width: 760px)");
  function panelEl(n) { return document.getElementById("panel-" + n); }
  function isOpen(n) { return !panelEl(n).hidden; }
  function setPanel(n, open, noFocus) {
    var el = panelEl(n);
    if (open && narrow.matches) PANELS.forEach(function (o) { if (o !== n) setPanel(o, false, true); });
    el.hidden = !open;
    var btn = $('.tools [data-panel="' + n + '"]');
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && !noFocus) { var cl = $(".close", el); if (cl) cl.focus(); }
  }
  PANELS.forEach(function (n) {
    $('.tools [data-panel="' + n + '"]').addEventListener("click", function () { setPanel(n, !isOpen(n)); if (isOpen(n) === false) this.focus(); });
    $(".close", panelEl(n)).addEventListener("click", function () { setPanel(n, false); var b = $('.tools [data-panel="' + n + '"]'); if (b) b.focus(); });
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    if (!$("#dialog-back").hidden) { closeDialog(); return; }
    // Leaflet only handles Esc when the map container has focus; here it also works with focus on a pin
    if (map._popup && map._popup.isOpen && map._popup.isOpen() && $("#map").contains(document.activeElement)) { map.closePopup(); return; }
    // with focus inside a panel, Esc closes it
    var inside = PANELS.filter(function (n) { return isOpen(n) && panelEl(n).contains(document.activeElement); })[0];
    if (inside) {
      setPanel(inside, false);
      var ib = $('.tools [data-panel="' + inside + '"]');
      if (ib) ib.focus();
      return;
    }
    for (var i = PANELS.length - 1; i >= 0; i--) {
      if (isOpen(PANELS[i]) && (narrow.matches || PANELS[i] === "settings")) {
        setPanel(PANELS[i], false);
        var b = $('.tools [data-panel="' + PANELS[i] + '"]');
        if (b) b.focus();
        return;
      }
    }
  });

  /* ---------- category row (legend and layers panel) ---------- */
  function catRow(c) {
    var cb = h("input", { type: "checkbox", "data-cat": c.id, "aria-label": c.id + " " + c.label_en });
    cb.addEventListener("change", function () { setCat(c.id, cb.checked); });
    var lab = h("label", null, [cb, h("span", { class: "chip", style: "background:" + safeColor(c.color) }), h("span", { class: "cat-id", text: c.id }), h("span", { class: "cat-name", text: c.label_en })]);
    var n = h("span", { class: "cat-n", text: String(counts[c.id] || 0), title: "Places in this category" });
    var only = h("button", { type: "button", class: "only", text: "only", title: "Show only " + c.id, "aria-label": "Show only " + c.id + ": " + c.label_en });
    only.addEventListener("click", function () { setOnly(c.id); });
    return h("li", { class: "cat-row", "data-row": c.id }, [lab, n, only]);
  }
  function layerGroup(layer) {
    var total = layer.cats.reduce(function (s, c) { return s + (counts[c.id] || 0); }, 0);
    var cb = h("input", { type: "checkbox", "data-layer": layer.id, "aria-label": "Layer " + layer.name });
    cb.addEventListener("change", function () { setLayerCats(layer, cb.checked); });
    var head = h("div", { class: "group-head" }, [h("label", null, [cb, h("span", { text: layer.name })]), h("span", { class: "cat-n", text: total + " places" })]);
    var ul = h("ul", { class: "cats" }, layer.cats.map(catRow));
    return h("div", { class: "group" }, [head, ul]);
  }
  function bulkButtons() {
    return h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn small", text: "Show all categories", onclick: showAll }),
      h("button", { type: "button", class: "btn small", text: "Hide all categories", onclick: hideAll }),
    ]);
  }

  /* ---------- layers panel ---------- */
  (function buildLayersPanel() {
    var body = $("#panel-layers .body");
    body.appendChild(bulkButtons());
    LAYERS.forEach(function (l) { body.appendChild(layerGroup(l)); });
    var tr = h("div", { class: "group" });
    tr.appendChild(h("div", { class: "group-head" }, [h("span", { text: "Public transport" })]));
    var ul = h("ul", { class: "cats" });
    [["U", "U-Bahn", "", ""], ["S", "S-Bahn", "", ""], ["tram", "Tram", "thin", ""], ["bus", "Bus", "hair", "off by default"]].forEach(function (t) {
      var cb = h("input", { type: "checkbox", "data-transit": t[0], "aria-label": t[1] });
      cb.addEventListener("change", function () { setTransit(t[0], cb.checked); });
      var sample = h("span", { class: "line-sample " + t[2] });
      var col = t[0] === "U" || t[0] === "S" ? "#555555" : (transitGroups[t[0]].getLayers()[0] ? transitGroups[t[0]].getLayers()[0].options.color : "#888");
      sample.style.borderColor = col || "#888";
      var name = t[1] + " (" + transitCounts[t[0]] + " lines" + (t[3] ? ", " + t[3] : "") + ")";
      ul.appendChild(h("li", { class: "cat-row" }, [h("label", null, [cb, sample, h("span", { class: "cat-name", text: name })])]));
    });
    tr.appendChild(ul);
    tr.appendChild(h("div", { class: "hint", text: "Stations appear when you zoom in. Hover over a line or a station to see its name." }));
    body.appendChild(tr);
    var bd = h("div", { class: "group" });
    var bcb = h("input", { type: "checkbox", "data-boundaries": "1", "aria-label": "District boundaries" });
    bcb.addEventListener("change", function () { setBoundaries(bcb.checked); });
    bd.appendChild(h("div", { class: "group-head" }, [h("label", null, [bcb, h("span", { text: "District boundaries" })])]));
    body.appendChild(bd);
    var base = h("div", { class: "group" });
    base.appendChild(h("div", { class: "group-head" }, [h("span", { text: "Base map" })]));
    Object.keys(BASES).forEach(function (k) {
      var r = h("input", { type: "radio", name: "base", value: k, "data-base": k });
      r.addEventListener("change", function () { if (r.checked) setBase(k); });
      base.appendChild(h("div", { class: "cat-row" }, [h("label", null, [r, h("span", { class: "cat-name", text: BASES[k].name })])]));
    });
    body.appendChild(base);
  })();

  /* ---------- legend ---------- */
  function pinDemo(kind) {
    var S = 22;
    var neutral = "#5f6b76";
    var style = function (bg, fg) { return "--c:" + neutral + ";--bg:" + bg + ";--fg:" + fg + ";--s:" + S + "px"; };
    var wrap = h("div", { class: "demo-wrap" });
    var pin;
    switch (kind) {
      case "solid": pin = h("div", { class: "pin", style: style(neutral, "#fff") }, [h("span", { class: "pl", text: "H" })]); break;
      case "open": pin = h("div", { class: "pin", style: style("#fff", "#1f2933") }, [h("span", { class: "pl", text: "H" })]); break;
      case "star": pin = h("div", { class: "pin", style: style("#fff", "#1f2933") }, [h("span", { class: "pl", text: "H" })]); break;
      case "muni": S = 30; pin = h("div", { class: "pin muni", style: style("#fff", "#1f2933") }, [h("span", { class: "pl", text: "A" })]); break;
      case "approx": pin = h("div", { class: "pin approx", style: style("#fff", "#1f2933") }, [h("span", { class: "pl", text: "?" })]); break;
      case "site": pin = h("div", { class: "sat", style: "--c:" + neutral + ";--bg:" + tint(neutral, 0.7) }); break;
    }
    wrap.appendChild(pin);
    if (kind === "star") wrap.appendChild(h("span", { class: "pin-star", text: "★", style: "right:1px;top:-1px" }));
    return h("div", { class: "demo" }, [wrap]);
  }
  (function buildLegend() {
    var body = $("#panel-legend .body");
    body.appendChild(h("div", { class: "hint", text: "Colour = category. Tick a category to show it and untick it to hide it; “only” hides all the others." }));
    body.appendChild(bulkButtons());
    LAYERS.forEach(function (l) { body.appendChild(layerGroup(l)); });
    var g = h("div", { class: "group" }, [h("div", { class: "group-head", text: "Reading a pin" })]);
    var grid = h("div", { class: "legend-pins" });
    [
      ["solid", "Solid fill: open job ad"],
      ["open", "White fill with a coloured border: no ad found"],
      ["star", "White fill with a star: invites applications"],
      ["muni", "Larger pin: municipal music school"],
      ["approx", "Dashed border: approximate location (postcode only)"],
      ["site", "Small dashed dot: a branch; it opens the main place"],
    ].forEach(function (r) { grid.appendChild(pinDemo(r[0])); grid.appendChild(h("div", { text: r[1] })); });
    g.appendChild(grid);
    g.appendChild(h("div", { class: "hint", text: "The letter in the pin is the contract type:" }));
    var letters = h("div", { class: "legend-letters" });
    CONTRACTS.forEach(function (c) { letters.appendChild(h("b", { text: c.code })); letters.appendChild(h("span", { text: c.label })); });
    g.appendChild(letters);
    body.appendChild(g);
    if (INSTR.length) {
      var ig = h("div", { class: "group" }, [h("div", { class: "group-head", text: "Instrument families" })]);
      var il = h("ul", { class: "instr-legend" }, INSTR.map(function (f) {
        return h("li", null, [h("b", { text: f.label_en }), document.createTextNode((f.examples_en && f.examples_en.length ? ": " + f.examples_en.join(", ") : ""))]);
      }));
      ig.appendChild(il);
      ig.appendChild(h("div", { class: "hint", text: "Use these families in the Filters panel." }));
      body.appendChild(ig);
    }
    var t = h("div", { class: "group" }, [h("div", { class: "group-head", text: "Public transport" })]);
    t.appendChild(h("div", { class: "hint", text: "U-Bahn" }));
    var chips = function (arr) {
      var w = h("div", { class: "chips" });
      arr.forEach(function (x) { w.appendChild(h("span", { class: "fchip", style: "border-color:" + safeColor(x.color) + ";border-width:2px;cursor:default", text: x.name })); });
      return w;
    };
    t.appendChild(chips(lineColors.U));
    t.appendChild(h("div", { class: "hint", text: "S-Bahn" }));
    t.appendChild(chips(lineColors.S));
    t.appendChild(h("div", { class: "hint", text: "Tram: thin lines. Bus: the finest lines, with MetroBus slightly thicker (buses are off by default). A dashed segment has no trains in the timetable data and is replaced by buses." }));
    body.appendChild(t);
    body.appendChild(h("div", { class: "hint", text: "Data checked " + (META.data_date || "n/a") + " · " + entities.length + " places on the map." }));
  })();

  /* ---------- filters ---------- */
  var chipSyncs = [];
  (function buildFilters() {
    var body = $("#panel-filters .body");
    var stack = h("div", { class: "stack" });
    // Row of toggle chips; items = [{key, node}], isOn/setOn work on the view state
    function chipGroup(id, title, items, isOn, setOn, hint) {
      var wrap = h("div", { "data-group": id });
      wrap.appendChild(h("div", { class: "hint", text: title }));
      var chips = h("div", { class: "chips" });
      items.forEach(function (it) {
        var b = h("button", { type: "button", class: "fchip", "aria-pressed": isOn(it.key) ? "true" : "false", "data-chip": id, "data-key": it.key }, it.kids);
        b.addEventListener("click", function () {
          var on = b.getAttribute("aria-pressed") !== "true";
          b.setAttribute("aria-pressed", on ? "true" : "false");
          setOn(it.key, on);
          applyFilters();
        });
        chips.appendChild(b);
      });
      wrap.appendChild(chips);
      if (hint) wrap.appendChild(h("div", { class: "hint", text: hint }));
      chipSyncs.push(function () { $$('[data-chip="' + id + '"]', wrap).forEach(function (b) { b.setAttribute("aria-pressed", isOn(b.getAttribute("data-key")) ? "true" : "false"); }); });
      return wrap;
    }
    if (INSTR.length) {
      stack.appendChild(chipGroup("instr", "Instrument family", INSTR.map(function (f) {
        return { key: f.id, kids: [document.createTextNode(f.label_en + " "), h("span", { class: "chip-n", text: String(instrCounts[f.id] || 0) })] };
      }), function (k) { return !!view.instr[k]; }, function (k, on) { if (on) view.instr[k] = true; else delete view.instr[k]; },
      "Shows places that teach any of the selected families. With none selected, every place is shown."));
    }
    stack.appendChild(chipGroup("contract", "Contract type (letter on the pin)", CONTRACTS.map(function (c) {
      return { key: c.code, kids: [h("b", { text: c.code }), document.createTextNode(c.short)] };
    }), function (k) { return view.contract[k]; }, function (k, on) { view.contract[k] = on; }));
    stack.appendChild(chipGroup("offer", "Job ads", OFFER_STATES.map(function (o) {
      return { key: o.key, kids: [document.createTextNode(o.label)] };
    }), function (k) { return view.offer[k]; }, function (k, on) { view.offer[k] = on; }));
    var muni = h("input", { type: "checkbox", id: "f-muni" });
    muni.addEventListener("change", function () { view.muni = muni.checked; applyFilters(); });
    stack.appendChild(h("label", { class: "row" }, [muni, document.createTextNode("Municipal music schools only")]));
    var dsel = h("select", { id: "f-district" }, [h("option", { value: "", text: "All districts" })].concat(DISTRICT_NAMES.map(function (n) { return h("option", { value: n, text: n }); })));
    dsel.addEventListener("change", function () { view.district = dsel.value; applyFilters(); });
    stack.appendChild(h("label", { class: "field" }, [h("span", { text: "District" }), dsel]));
    stack.appendChild(h("button", { type: "button", class: "btn small", text: "Reset filters", onclick: function () {
      CONTRACTS.forEach(function (c) { view.contract[c.code] = true; });
      OFFER_STATES.forEach(function (o) { view.offer[o.key] = true; });
      view.instr = {};
      view.muni = false; view.district = ""; query = ""; $("#q").value = "";
      syncFilterUI();
      applyFilters();
    } }));
    stack.appendChild(h("p", { class: "hint", text: "Filters work together with the category switches and the search box." }));
    body.appendChild(stack);
  })();
  function syncFilterUI() {
    chipSyncs.forEach(function (f) { f(); });
    $("#f-muni").checked = view.muni;
    $("#f-district").value = view.district;
  }

  /* ---------- search ---------- */
  var qInput = $("#q");
  qInput.addEventListener("input", debounce(function () { query = fold(qInput.value.trim()); applyFilters(); }, 120));
  qInput.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter") return;
    query = fold(qInput.value.trim());
    applyFilters();
    var pts = entities.filter(function (e) { return e.visible; }).map(function (e) { return [e.d.geo.lat, e.d.geo.lng]; });
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
  });

  /* ====================== settings ====================== */
  var INSTRUMENT_EXAMPLES = { de: "e.g. Klavier", en: "e.g. piano", es: "e.g. piano", it: "e.g. pianoforte" };
  var PLACEHOLDER_HELP = [
    ["{{greeting}}", "salutation to the team of the place"],
    ["{{entity_name}}", "name of the place"],
    ["{{role}}", "what you offer, chosen from the category of the place"],
    ["{{position_title}}", "title of the job ad (ads only)"],
    ["{{offer_url}}", "link to the job ad (ads only)"],
    ["{{my_name}}", "your name"],
    ["{{instrument}}", "your instrument or subject, in the language of the email"],
    ["{{languages}}", "the languages you teach in"],
    ["{{bio}}", "your short bio, in the language of the email"],
    ["{{cv_link}}", "your CV link"],
    ["{{signature}}", "your signature"],
  ];
  function buildSettings() {
    var body = clear($("#panel-settings .body"));
    var tabLang = "de", tabVariant = "initiative", previewId = "";
    var stack = h("div", { class: "stack" });
    stack.appendChild(h("p", { class: "hint", text: "Everything here is saved only in this browser and is never uploaded. Emails are opened or downloaded on your own device." }));
    if (!settings.name) stack.appendChild(h("p", { class: "note warn", text: "Your profile is empty. Add your name, instrument and signature before you send emails." }));

    function persist() { saveSettings(); updatePreview(); }
    function textField(label, get, set, opts) {
      opts = opts || {};
      var inp = opts.area ? h("textarea", { rows: opts.rows || 3, class: opts.code ? "code" : null }) : h("input", { type: opts.type || "text" });
      inp.value = get();
      inp.addEventListener("input", function () { set(inp.value); persist(); });
      if (opts.placeholder) inp.placeholder = opts.placeholder;
      return { node: h("label", { class: "field" }, [h("span", { text: label }), inp]), input: inp };
    }

    var general = h("fieldset", null, [h("legend", { text: "About you" })]);
    general.appendChild(textField("Your name", function () { return settings.name; }, function (v) { settings.name = v; }).node);
    general.appendChild(textField("Your email address (sender of the .eml draft)", function () { return settings.email; }, function (v) { settings.email = v; }, { type: "email" }).node);
    var langs = h("fieldset", null, [h("legend", { text: "Languages you teach in" })]);
    var lrow = h("div", { class: "row" });
    LANG_OPTIONS.forEach(function (l) {
      var cb = h("input", { type: "checkbox" });
      cb.checked = settings.teachingLanguages.indexOf(l[0]) >= 0;
      cb.addEventListener("change", function () {
        var set = settings.teachingLanguages.filter(function (x) { return x !== l[0]; });
        if (cb.checked) set.push(l[0]);
        settings.teachingLanguages = set;
        persist();
      });
      lrow.appendChild(h("label", { class: "row" }, [cb, document.createTextNode(l[1])]));
    });
    langs.appendChild(lrow);
    general.appendChild(langs);
    general.appendChild(textField("Signature", function () { return settings.signature; }, function (v) { settings.signature = v; }, { area: true, rows: 3 }).node);
    general.appendChild(textField("Link to your CV (optional)", function () { return settings.cvLink; }, function (v) { settings.cvLink = v.trim(); }, { type: "url", placeholder: "https://…" }).node);
    // CV file
    var cvStatus = h("div", { class: "hint", role: "status" });
    var cvInput = h("input", { type: "file", accept: "application/pdf,.pdf", id: "cv-file" });
    function showCv() {
      cvStore.get().then(function (rec) {
        cvStatus.textContent = rec && rec.name
          ? (rec.volatile ? "Kept in memory until you close this page: " : "Stored in this browser: ") + rec.name + " (" + Math.round((rec.size || 0) / 1024) + " KB). It is used only for the .eml draft."
          : "No CV file chosen. The .eml draft will have no attachment.";
      });
    }
    cvInput.addEventListener("change", function () {
      var f = cvInput.files && cvInput.files[0];
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) { toast("That file is larger than 8 MB. Choose a smaller PDF."); return; }
      var rd = new FileReader();
      rd.onload = function () {
        cvStore.put({ name: f.name, type: f.type || "application/pdf", size: f.size, data: rd.result }).then(function (ok) {
          showCv();
          toast(ok ? "CV file stored in this browser." : "Your browser would not store the file, so it is kept only until you close or reload this page.");
        });
      };
      rd.onerror = function () { toast("Could not read that file."); };
      rd.readAsArrayBuffer(f);
    });
    general.appendChild(h("div", { class: "field" }, [h("span", { text: "CV file (PDF, attached to the .eml draft)" }), cvInput]));
    general.appendChild(cvStatus);
    general.appendChild(h("button", { type: "button", class: "btn small", text: "Remove CV file", onclick: function () { cvStore.del().then(function () { cvInput.value = ""; showCv(); }); } }));
    showCv();
    stack.appendChild(general);

    // texts by language
    var texts = h("fieldset", null, [h("legend", { text: "Email texts" })]);
    var tabs = h("div", { class: "tabs", role: "tablist", "aria-label": "Language of the email text" });
    var area = h("div");
    function renderTabs() {
      clear(tabs);
      Mail.LANGS.forEach(function (l) {
        var b = h("button", { type: "button", role: "tab", "aria-selected": l === tabLang ? "true" : "false", text: Mail.LANG_NAMES[l] });
        b.addEventListener("click", function () { tabLang = l; renderTabs(); renderArea(); updatePreview(); });
        tabs.appendChild(b);
      });
    }
    function renderArea() {
      clear(area);
      var ln = Mail.LANG_NAMES_EN[tabLang];
      area.appendChild(textField("Instrument or subject, as written in " + ln + " emails", function () { return settings.instrument[tabLang]; }, function (v) { settings.instrument[tabLang] = v; }, { placeholder: INSTRUMENT_EXAMPLES[tabLang] }).node);
      area.appendChild(textField("Short bio for " + ln + " emails (one or two sentences)", function () { return settings.bio[tabLang]; }, function (v) { settings.bio[tabLang] = v; }, { area: true, rows: 3 }).node);
      var vt = h("div", { class: "tabs", role: "tablist", "aria-label": "Kind of email" });
      Mail.VARIANTS.forEach(function (v) {
        var b = h("button", { type: "button", role: "tab", "aria-selected": v === tabVariant ? "true" : "false", text: Mail.VARIANT_NAMES[v] });
        b.addEventListener("click", function () { tabVariant = v; renderArea(); updatePreview(); });
        vt.appendChild(b);
      });
      area.appendChild(vt);
      var t = settings.templates[tabLang][tabVariant];
      var sub = textField("Subject", function () { return t.subject; }, function (v) { t.subject = v; });
      var bod = textField("Message", function () { return t.body; }, function (v) { t.body = v; }, { area: true, code: true, rows: 12 });
      area.appendChild(sub.node);
      area.appendChild(bod.node);
      area.appendChild(h("button", { type: "button", class: "btn small", text: "Restore the default text", onclick: function () {
        var def = Mail.DEFAULT_TEMPLATES[tabLang][tabVariant];
        t.subject = def.subject; t.body = def.body;
        sub.input.value = def.subject; bod.input.value = def.body;
        persist();
      } }));
    }
    texts.appendChild(tabs);
    texts.appendChild(area);
    var help = h("details", { class: "fold" }, [h("summary", { text: "Placeholders you can use in the texts" })]);
    var hl = h("dl", { class: "ph-list" });
    PLACEHOLDER_HELP.forEach(function (p) { hl.appendChild(h("dt", null, [h("code", { text: p[0] })])); hl.appendChild(h("dd", { text: p[1] })); });
    help.appendChild(hl);
    help.appendChild(h("p", { class: "hint", text: "A line whose placeholder is empty is left out of the email." }));
    texts.appendChild(help);
    stack.appendChild(texts);

    // preview
    var prevSel = h("select", { "aria-label": "Place for the preview" }, entities.slice().sort(function (a, b) { return a.d.name.localeCompare(b.d.name); }).map(function (e) {
      return h("option", { value: e.d.id, text: e.d.name });
    }));
    var prevOut = h("pre", { class: "preview", "aria-live": "polite" });
    prevSel.addEventListener("change", function () { previewId = prevSel.value; updatePreview(); });
    function updatePreview() {
      var e = entities.filter(function (x) { return x.d.id === (previewId || prevSel.value); })[0] || entities[0];
      if (!e) { prevOut.textContent = "There are no places to preview."; return; }
      var msg = Mail.compose(e.d, settings, { lang: tabLang, variant: tabVariant });
      prevOut.textContent = plainMessage(msg);
    }
    stack.appendChild(h("details", { class: "fold", open: true }, [
      h("summary", { text: "Preview with a real place" }),
      h("label", { class: "field" }, [h("span", { text: "Place" }), prevSel]),
      prevOut,
    ]));

    // export / import
    var imp = h("input", { type: "file", accept: "application/json,.json", class: "sr-only", id: "import-file", tabindex: "-1" });
    imp.addEventListener("change", function () {
      var f = imp.files && imp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var obj = JSON.parse(rd.result);
          var src = obj && obj.settings ? obj.settings : obj;
          settings = Mail.normalizeSettings(src);
          store.set(SETTINGS_KEY, settings);
          rebuild();
          toast("Settings imported.");
        } catch (err) { toast("That file is not a valid settings export."); }
      };
      rd.readAsText(f);
      imp.value = "";
    });
    stack.appendChild(h("div", { class: "row" }, [
      h("button", { type: "button", class: "btn", text: "Export settings", onclick: function () {
        var payload = { app: "berlin-music-map", version: 1, exported: today(), settings: settings, note: "The CV file itself is not included." };
        downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), "berlin-music-map-settings.json");
      } }),
      h("button", { type: "button", class: "btn", text: "Import settings", onclick: function () { imp.click(); } }),
      h("button", { type: "button", class: "btn", text: "Clear all settings", onclick: function () {
        openDialog("Clear all settings?", [h("p", { text: "Your name, signature and email texts will be cleared and the default templates restored. A stored CV file is kept." })], [
          { text: "Clear settings", primary: true, run: function () { settings = Mail.normalizeSettings(null); store.set(SETTINGS_KEY, settings); rebuild(); toast("Settings cleared."); } },
          { text: "Cancel" },
        ]);
      } }),
      imp,
    ]));

    function rebuild() { buildSettings(); }
    renderTabs();
    renderArea();
    body.appendChild(stack);
    updatePreview();
  }

  /* ====================== start-up ====================== */
  function init() {
    buildSettings();
    syncFilterUI();
    $$("input[data-transit]").forEach(function (cb) { cb.checked = !!view.transit[cb.getAttribute("data-transit")]; });
    $$("input[data-boundaries]").forEach(function (cb) { cb.checked = view.boundaries; });
    $$("input[data-base]").forEach(function (r) { r.checked = r.getAttribute("data-base") === view.base; });
    setBase(view.base);
    ["bus", "tram", "S", "U"].forEach(function (m) { if (view.transit[m]) map.addLayer(transitGroups[m]); });
    updateTransitWeights();
    updateStations();
    setPinScale();
    if (view.boundaries) map.addLayer(boundaryLayer);
    applyFilters();
    var pts = entities.map(function (e) { return [e.d.geo.lat, e.d.geo.lng]; });
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [24, 24] });
    var w = window.innerWidth, hgt = window.innerHeight;
    if (w >= 900) setPanel("layers", true, true);
    if (w >= 1200 && hgt >= 760) setPanel("legend", true, true);
    // hooks for scripts/smoke_map.js
    window.__bmm = { transitGroups: transitGroups, boundaryLayer: boundaryLayer, map: map, entities: entities, view: view, applyFilters: applyFilters, setOnly: setOnly, showAll: showAll, setTransit: setTransit, settings: function () { return settings; }, counts: counts, instrCounts: instrCounts, transitCounts: transitCounts };
  }
  init();
})();
