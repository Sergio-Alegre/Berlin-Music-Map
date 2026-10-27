#!/usr/bin/env node
// Smoke test of the map with headless Edge or Chrome (no dependencies): opens the HTML from disk (file://) and checks
// the pin and satellite counts, no horizontal scroll at 380 px, popups, that every marker sits exactly on its
// coordinate at several zoom levels, and the category and instrument-family filters.
// Usage: node scripts/smoke_map.js [dist/berlin-music-map.html] [--jobs data/jobs.json]   (BROWSER=path to the browser)
// --jobs must be the data the HTML was built from (build_map.py --jobs ...); the expected counts come from it.
// SHOT=<dir> also saves screenshots (map, filters, settings, popup) for a visual check.
// Tile network errors (offline, connection reset) are counted apart: they are not code errors.
const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const jobsArg = args.indexOf("--jobs");
const JOBS_FILE = path.resolve(jobsArg >= 0 ? args[jobsArg + 1] : path.join(__dirname, "..", "data", "jobs.json"));
const positional = args.filter((a, i) => !a.startsWith("--") && (jobsArg < 0 || i !== jobsArg + 1));
const html = path.resolve(positional[0] || path.join(__dirname, "..", "dist", "berlin-music-map.html"));
const CANDIDATES = [
  process.env.BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
].filter(Boolean);
const exe = CANDIDATES.find((p) => fs.existsSync(p));
if (!exe) { console.error("Cannot find Edge or Chrome: set BROWSER"); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (url) => new Promise((res, rej) => http.get(url, (r) => { let b = ""; r.on("data", (c) => (b += c)); r.on("end", () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on("error", rej));

async function open(width, height) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bmm-smoke-"));
  const proc = spawn(exe, ["--headless=new", "--disable-gpu", "--no-first-run", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
  let targets = [];
  for (let i = 0; i < 60 && !targets.length; i++) { try { targets = await getJSON(`http://127.0.0.1:${port}/json`); } catch (e) { await sleep(250); } }
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const p = pending.get(msg.id); pending.delete(msg.id); msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result); return; }
    if (msg.method === "Runtime.exceptionThrown") logs.push({ kind: "exception", text: msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text });
    if (msg.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(msg.params.type)) logs.push({ kind: "console." + msg.params.type, text: msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ") });
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") logs.push({ kind: /tile|arcgisonline|openstreetmap|cartocdn/.test(msg.params.entry.url || "") ? "tile-network" : "log.error", text: msg.params.entry.text + " " + (msg.params.entry.url || "") });
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  await send("Page.navigate", { url: "file:///" + html.replace(/\\/g, "/") });
  await sleep(3500);
  const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
  const shot = async (name) => { if (!process.env.SHOT) return; fs.mkdirSync(process.env.SHOT, { recursive: true }); const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(process.env.SHOT, `${name}-${width}.png`), Buffer.from(r.data, "base64")); };
  return { ev, logs, shot, close: async () => { try { await send("Browser.close"); } catch (e) { /* ignore */ } proc.kill(); await sleep(300); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* ignore */ } } };
}

const jobs = JSON.parse(fs.readFileSync(JOBS_FILE, "utf8"));
const NPINS = jobs.length;
const nSats = (list) => list.reduce((a, e) => a + (e.sites || []).filter((x) => x.geo).length, 0);
const NSATS = nSats(jobs);
const cats = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "categories.json"), "utf8"));
const fams = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "instruments.json"), "utf8"));
const hasInstr = jobs.some((e) => (e.instruments || []).length);

(async () => {
  let failed = 0;
  const check = (cond, msg) => { console.log((cond ? "ok   " : "FAIL ") + msg); if (!cond) failed++; };
  for (const [w, h] of [[1280, 800], [380, 800]]) {
    const b = await open(w, h);
    try {
      console.log(`--- ${w}x${h}`);
      const pins = () => b.ev("document.querySelectorAll('.pin-wrap').length");
      const sats = () => b.ev("document.querySelectorAll('.sat-wrap').length");
      const counter = () => b.ev("document.querySelector('#count b').textContent");
      const click = (sel) => b.ev(`(()=>{const n=document.querySelector(${JSON.stringify(sel)});if(!n)return false;n.click();return true})()`);
      const clickText = (scope, text) => b.ev(`(()=>{const n=Array.from(document.querySelectorAll(${JSON.stringify(scope)})).filter(x=>x.textContent.trim()===${JSON.stringify(text)})[0];if(!n)return false;n.click();return true})()`);
      check((await pins()) === NPINS, NPINS + " pins");
      check((await sats()) === NSATS, NSATS + " satellites for branches");
      check((await b.ev("document.documentElement.scrollWidth")) <= w, "no horizontal scroll");
      check((await b.ev("document.title")) === "Berlin Music Map", "page title");
      check((await b.ev("typeof window.__bmm === 'object' && !window.__bmj")) === true, "no leftovers of the old project");
      const text = await b.ev("document.body.innerText + ' ' + Array.from(document.querySelectorAll('[aria-label],[title],[placeholder]')).map(n=>n.getAttribute('aria-label')+' '+n.title+' '+n.placeholder).join(' ')");
      check(!/photograph|remote \/ citywide|orchestra substitute/i.test(text), "interface text has no personal or old-project words");
      const settings = await b.ev("JSON.stringify(window.__bmm.settings())");
      check(/"name":""/.test(settings) && /"email":""/.test(settings) && /"signature":""/.test(settings) && /"cvLink":""/.test(settings), "settings start empty");
      const rows = await b.ev("Array.from(document.querySelectorAll('#panel-legend [data-row]')).map(r=>r.getAttribute('data-row'))");
      check(rows.join() === cats.map((c) => c.id).join(), "legend lists the categories of categories.json: " + rows.join(" "));
      const layerNames = await b.ev("Array.from(document.querySelectorAll('#panel-layers .group-head label span')).map(n=>n.textContent)");
      check(layerNames.includes("Teaching · Music") && layerNames.includes("Singing & choirs") && layerNames.includes("District boundaries"), "layer names: " + layerNames.join(" | "));
      await b.shot("map");
      // popup
      await b.ev("(()=>{const e=window.__bmm.entities[0]; window.__bmm.map.setView([e.d.geo.lat,e.d.geo.lng],15,{animate:false}); e.marker.openPopup(); return 1})()");
      await sleep(800);
      check((await b.ev("document.querySelectorAll('.leaflet-popup').length")) === 1, "the popup opens");
      const btns = await b.ev("Array.from(document.querySelectorAll('.leaflet-popup .actions .btn')).map(n=>n.textContent.trim())");
      for (const want of ["Email + CV (.eml)", "Copy text", "Directions", "Sources"]) check(btns.includes(want), `popup button "${want}"`);
      check((await b.ev("document.documentElement.scrollWidth")) <= w, "no horizontal scroll with the popup open");
      await b.shot("popup");
      await b.ev("window.__bmm.map.closePopup(), 1");
      // panels at this width: open each one and look for horizontal overflow
      for (const p of ["filters", "legend", "layers", "settings"]) {
        const wasOpen = await b.ev(`!document.getElementById('panel-${p}').hidden`);
        if (!wasOpen) await click(`.tools [data-panel="${p}"]`);
        await sleep(150);
        const over = await b.ev(`(()=>{const el=document.getElementById('panel-${p}');return el.scrollWidth-el.clientWidth})()`);
        await b.shot("panel-" + p);
        check(over <= 1, `panel ${p} has no horizontal overflow (${over})`);
        check((await b.ev("document.documentElement.scrollWidth")) <= w, `no horizontal scroll with ${p} open`);
        if (!wasOpen) await click(`#panel-${p} .close`);
      }
      // the panels must be usable below (they stay in the DOM); make sure the filter panel is built even if closed
      /* ---- category filter ---- */
      const first = cats[0].id;
      const inFirst = jobs.filter((e) => e.category === first);
      await click(`#panel-layers [data-row="${first}"] .only`);
      check((await pins()) === inFirst.length && (await sats()) === nSats(inFirst), `"only ${first}": ${inFirst.length} pins and ${nSats(inFirst)} satellites`);
      check((await counter()) === String(inFirst.length), "the counter follows the category filter");
      check(await b.ev(`window.__bmm.entities.filter(e=>e.visible).every(e=>e.d.category===${JSON.stringify(first)})`), "only that category is visible");
      await clickText("#panel-layers .btn", "Show all categories");
      check((await pins()) === NPINS, '"Show all categories" brings every pin back');
      const singing = cats.filter((c) => c.layer === "singing").map((c) => c.id);
      const nSing = jobs.filter((e) => singing.includes(e.category)).length;
      await click('#panel-layers input[data-layer="singing"]');
      check((await pins()) === NPINS - nSing, `layer "Singing & choirs" off hides ${nSing} pins`);
      await click('#panel-layers input[data-layer="singing"]');
      check((await pins()) === NPINS, "layer back on");
      await click(`#panel-layers input[data-cat="${first}"]`);
      check((await pins()) === NPINS - inFirst.length, `switch of ${first} hides its ${inFirst.length} pins`);
      await clickText("#panel-layers .btn", "Show all categories");

      /* ---- instrument-family filter ---- */
      if (!hasInstr) {
        console.log("note no place in the data has instrument families: instrument checks skipped");
      } else {
        const chipIds = await b.ev("Array.from(document.querySelectorAll('[data-chip=\"instr\"]')).map(n=>n.getAttribute('data-key'))");
        check(chipIds.join() === fams.map((f) => f.id).join(), "one chip per family of instruments.json");
        const has = (e, ids) => (e.instruments || []).some((i) => ids.includes(i));
        const f1 = fams[0].id, f2 = fams[fams.length - 1].id;
        let exp = jobs.filter((e) => has(e, [f1]));
        await click(`[data-chip="instr"][data-key="${f1}"]`);
        check((await pins()) === exp.length && (await sats()) === nSats(exp), `family ${f1}: ${exp.length} pins and ${nSats(exp)} satellites`);
        check((await counter()) === String(exp.length), "the counter follows the instrument filter");
        check((await b.ev(`document.querySelector('[data-chip="instr"][data-key="${f1}"]').getAttribute('aria-pressed')`)) === "true", "the chip is pressed");
        exp = jobs.filter((e) => has(e, [f1, f2]));
        await click(`[data-chip="instr"][data-key="${f2}"]`);
        check((await pins()) === exp.length, `families ${f1} + ${f2} (any of them): ${exp.length} pins`);
        const both = exp.filter((e) => e.category === first);
        await click(`#panel-layers [data-row="${first}"] .only`);
        check((await pins()) === both.length, `${first} only + instrument filter: ${both.length} pins`);
        const dist = (both[0] || exp[0]).district;
        await b.ev(`(()=>{const s=document.getElementById('f-district');s.value=${JSON.stringify(dist)};s.dispatchEvent(new Event('change'))})()`);
        const three = both.filter((e) => e.district === dist);
        check((await pins()) === three.length, `+ district ${dist}: ${three.length} pins`);
        await clickText("#panel-filters .btn", "Reset filters");
        await clickText("#panel-layers .btn", "Show all categories");
        check((await pins()) === NPINS, "Reset filters and Show all categories restore every pin");
        check((await b.ev("document.querySelectorAll('[data-chip=\"instr\"][aria-pressed=\"true\"]').length")) === 0, "no instrument chip stays pressed after the reset");
        // text search by instrument detail
        const withDetail = jobs.find((e) => (e.instruments_detail || []).length);
        if (withDetail) {
          const term = withDetail.instruments_detail[0];
          await b.ev(`(()=>{const q=document.getElementById('q');q.value=${JSON.stringify(term)};q.dispatchEvent(new Event('input'))})()`);
          await sleep(400);
          const nT = await pins();
          check(nT >= 1 && (await b.ev(`window.__bmm.entities.find(e=>e.d.id===${JSON.stringify(withDetail.id)}).visible`)), `text search "${term}" finds the place through instruments_detail (${nT} pins)`);
          await b.ev("(()=>{const q=document.getElementById('q');q.value='';q.dispatchEvent(new Event('input'))})()");
          await sleep(400);
        }
        // the popup lists the instruments
        const withI = jobs.find((e) => (e.instruments || []).length);
        await b.ev(`(()=>{const e=window.__bmm.entities.find(x=>x.d.id===${JSON.stringify(withI.id)}); window.__bmm.map.setView([e.d.geo.lat,e.d.geo.lng],15,{animate:false}); e.marker.openPopup(); return 1})()`);
        await sleep(600);
        const pop = await b.ev("document.querySelector('.leaflet-popup-content') ? document.querySelector('.leaflet-popup-content').innerText : ''");
        const label = fams.find((f) => f.id === withI.instruments[0]).label_en;
        check(/Instruments/.test(pop) && pop.includes(label), `popup shows the instruments row (${label})`);
        await b.ev("window.__bmm.map.closePopup(), 1");
      }

      // Regression: every pin and satellite must sit exactly on its coordinate at any zoom
      await b.ev("window.__bmm.showAll(), 1");
      for (const z of [10, 13, 16, 18]) {
        await b.ev(`window.__bmm.map.setView([52.5, 13.4], ${z}, {animate:false}) && 1`);
        await sleep(450);
        const worst = await b.ev(`(()=>{const B=window.__bmm,m=B.map,c=m.getContainer().getBoundingClientRect();let w=0,n=0;
          B.entities.forEach(e=>{const mk=e.marker;if(!mk||!mk._icon||!m.hasLayer(mk))return;const r=mk._icon.getBoundingClientRect();const S=e.muni?38:30,dx=e.dx||0;
            const p=m.latLngToContainerPoint(mk.getLatLng());n++;w=Math.max(w,Math.abs(r.left-c.left+(S/2-dx)-p.x),Math.abs(r.top-c.top+Math.round(S*1.207)-p.y));
            (e.sats||[]).forEach(s=>{if(!s._icon||!m.hasLayer(s))return;const q=s._icon.getBoundingClientRect(),t=m.latLngToContainerPoint(s.getLatLng());n++;w=Math.max(w,Math.abs(q.left-c.left+7-t.x),Math.abs(q.top-c.top+7-t.y));});});
          return {w:Math.round(w*10)/10,n};})()`);
        check(worst.w <= 2 && worst.n > 0, `pins and satellites on their coordinate at zoom ${z} (${worst.n} markers, maximum offset ${worst.w} px)`);
      }
      const bad = b.logs.filter((l) => l.kind !== "tile-network");
      check(bad.length === 0, "no exceptions or console errors" + (bad.length ? ": " + bad.map((l) => l.text).join(" | ") : ""));
      const tiles = b.logs.filter((l) => l.kind === "tile-network").length;
      if (tiles) console.log(`note ${tiles} tile network errors (connection, not the code)`);
    } finally { await b.close(); }
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
