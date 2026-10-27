/* ===== M9 #534: TEXT MANUÁLŮ = AKTUÁLNÍ FAKTA, NE HISTORIE ROZHODNUTÍ =====
 *
 * Manuály (příručka obchodníka manual/obsah.json, příručka administrátora
 * manual/admin/obsah.json a manuál výpočtu manual_vypocet/sablona.html) popisují,
 * co platí, co uživatel uvidí a co má udělat. Kdo a kdy co rozhodl, čísla
 * nálezů, dávek a položek roadmapy ani „platí od verze…“ do nich nepatří —
 * historie žije v CHANGELOG. Výjimka: kapitola manuálu výpočtu „Rozdíly mezi
 * verzemi“ smí vyjmenovat verze (bez jmen, rozhodnutí a kódů).
 *
 * Hlídá se:
 *  (a) zakázané vzory v textu všech tří manuálů: iniciály „J. V.“, rozhodnutí
 *      či pokyn s datem nebo jménem, „(od vD.M.N“ a „od/do/před vD.M.N“, data
 *      „od/do/před D. M. RRRR“, kódy nálezů (K9-S1, K3-N17 …), B + tři číslice,
 *      čísla roadmapy „#123“; u manuálu výpočtu se čte sestavený text
 *      (sestav.js), HTML komentáře se nečtou;
 *  (b) šablony mají zalomení bez děr: manuál výpočtu nevynucuje novou stranu
 *      před každou kapitolou, příručky netlačí obsah na samostatnou stranu
 *      a tiskový obsah má zmenšené písmo; šablona umí bloky „odrazky“
 *      a „tabulka“ a retence záloh je v obou příručkách tabulkou;
 *  (c) (Chromium, je-li playwright) obsah příručky správce (47 kapitol)
 *      se v tisku A4 vejde na jednu stranu.
 *
 * Pojistka: nad obsahem a šablonami z 62ea0c8 (před M9) selže (a) u všech tří
 * manuálů, (b) i (c) — obsah správce končil na 1 035 px z 1 016 (12 FAIL,
 * 2 OK); `KNG_OBSAH`, `KNG_OBSAH_ADMIN`, `KNG_SABLONA`, `KNG_SABLONA_VYPOCET`
 * ukazují na starou verzi.
 */
const fs = require('fs');
const path = require('path');

let ok = 0, fail = 0, preskoceno = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); }
};
const KOREN = path.join(__dirname, '..');
const cti = (env, rel) => fs.readFileSync(process.env[env] || path.join(KOREN, rel), 'utf8');
const OBSAH = JSON.parse(cti('KNG_OBSAH', 'manual/obsah.json'));
const OBSAH_A = JSON.parse(cti('KNG_OBSAH_ADMIN', 'manual/admin/obsah.json'));
const SABLONA = cti('KNG_SABLONA', 'manual/sablona.html');
const SABLONA_V = cti('KNG_SABLONA_VYPOCET', 'manual_vypocet/sablona.html');

/* ---------- texty ---------- */
function retezce(o, cesta, ven) {
  if (typeof o === 'string') ven.push({ cesta, text: o });
  else if (Array.isArray(o)) o.forEach((x, i) => retezce(x, cesta + '[' + i + ']', ven));
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) {
    /* `verze` = „Platí pro aplikaci v… · sestaveno D. M. RRRR“ — datum sestavení je fakt vydání */
    if (k === 'verze' && cesta === '') continue;
    /* klik/popisek/sel/obsahuje = kotvy do snímků (texty aplikace), ne text příručky */
    if (['klik', 'sel', 'cely', 'popisek', 'pole', 'obsahuje', 'snimek', 'id'].includes(k)) continue;
    retezce(o[k], cesta + '.' + k, ven);
  }
  return ven;
}
function textVypoctu() {
  let html = SABLONA_V;
  if (!process.env.KNG_SABLONA_VYPOCET) {
    try { html = require('../manual_vypocet/sestav.js').sestav().html; } catch (e) { /* jádro nejde načíst — čte se šablona */ }
  }
  html = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  /* kapitola „Rozdíly mezi verzemi“ smí nést čísla verzí */
  const i = html.search(/<h2>Rozdíly mezi verzemi<\/h2>/);
  const odstran = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');
  return i < 0 ? { hlavni: odstran(html), rozdily: '' } : { hlavni: odstran(html.slice(0, i)), rozdily: odstran(html.slice(i)) };
}

const VZORY = [
  ['iniciály J. V.', /\bJ\.\s?V\./],
  ['rozhodnutí / pokyn s datem nebo jménem', /(rozhodnut[íoa]|pokyn\w*|schválen[oa]?)\s*(J\.|\d{1,2}\.\s?\d{1,2}\.|vlastník)/i],
  ['„(od vD.M.N“', /\(od v\d+\.\d+\.\d+/],
  ['od / do / před verzí vD.M.N', /\b(od|do|před|po)\s+v\d+\.\d+\.\d+/i],
  ['od / do / před datem D. M. RRRR', /\b(od|do|před|po)\s+\d{1,2}\.\s?\d{1,2}\.\s?20\d\d/i],
  ['kód nálezu K\\d-…', /\bK\d+-[VSNIW]\d+/],
  ['kód B + tři číslice', /\bB\d{3}\b/],
  ['číslo roadmapy #ddd', /#\d{3}\b/],
];
const VZORY_VERZE = VZORY.filter(([n]) => !/verzí|datem/.test(n));
function nalezy(texty, vzory) {
  const ven = [];
  for (const { cesta, text } of texty) for (const [n, re] of vzory) {
    const m = text.match(re);
    if (m) ven.push(n + ' — ' + cesta + ': „…' + text.slice(Math.max(0, m.index - 30), m.index + 40) + '…“');
  }
  return ven;
}

const tObch = retezce(OBSAH, '', []);
const tAdmin = retezce(OBSAH_A, '', []);
const vyp = textVypoctu();
test('(a) příručka obchodníka: ' + tObch.length + ' textů bez historie rozhodnutí a kódů', nalezy(tObch, VZORY).length === 0, nalezy(tObch, VZORY));
test('(a) příručka administrátora: ' + tAdmin.length + ' textů bez historie rozhodnutí a kódů', nalezy(tAdmin, VZORY).length === 0, nalezy(tAdmin, VZORY));
test('(a) manuál výpočtu: text bez historie rozhodnutí a kódů', nalezy([{ cesta: 'manual_vypocet', text: vyp.hlavni }], VZORY).length === 0,
  nalezy([{ cesta: 'manual_vypocet', text: vyp.hlavni }], VZORY));
test('(a) manuál výpočtu: kapitola „Rozdíly mezi verzemi“ existuje a nemá jména ani kódy', !!vyp.rozdily
  && nalezy([{ cesta: 'rozdily', text: vyp.rozdily }], VZORY_VERZE).length === 0, nalezy([{ cesta: 'rozdily', text: vyp.rozdily }], VZORY_VERZE));
test('(a) pojistka: vzory chytí historii rozhodnutí', ['(od v26.10.9, rozhodnutí J. V. 26. 10. 2026)', 'do 19. 10. 2026 platilo',
  'oprava K9-S1', 'nález B186', 'položka #447', 'pokyn J. V.'].every(s => nalezy([{ cesta: 'x', text: s }], VZORY).length > 0));
test('(a) pojistka: fakta aplikace vzory nechytí', nalezy([{ cesta: 'x', text: 'Rozhodnutí vrátit zpět smí jen nadřízený. Čeká na rozhodnutí. Schváleno automaticky. Nejdřív ověřte. sestaveno 27. 10. 2026' }], VZORY).length === 0);

/* ---------- sazba ---------- */
test('(b) manuál výpočtu nevynucuje novou stranu před každou kapitolou', !/\.kap\s*\{[^}]*break-before\s*:\s*page/.test(SABLONA_V));
test('(b) nadpis kapitoly manuálu výpočtu drží s textem', /\.kaph\s*\{[^}]*break-after\s*:\s*avoid/.test(SABLONA_V));
test('(b) příručky netlačí obsah na samostatnou stranu', !/#obsah\s*\{[^}]*break-after\s*:\s*page/.test(SABLONA));
test('(b) tiskový obsah příruček má zmenšené písmo', /@media print[\s\S]*\.obsah-list\s*\{[^}]*font-size\s*:\s*[0-9.]+pt/.test(SABLONA));
test('(b) šablona umí bloky „odrazky“ a „tabulka“', /b\.typ === 'odrazky'/.test(SABLONA) && /b\.typ === 'tabulka'/.test(SABLONA));
test('(b) snímek se v tisku zmenší i podle výšky (PAPIR_VYSKA)', /PAPIR_VYSKA\s*\/\s*Math\.max/.test(SABLONA));
const maTabulkuZaloh = (o) => JSON.stringify(o).match(/"typ":\s*"tabulka"[^\]]*"Netlify"[^\]]*"Disk Google"/);
test('(b) retence záloh je tabulkou Netlify × Disk v obou příručkách', !!maTabulkuZaloh(OBSAH) && !!maTabulkuZaloh(OBSAH_A));

/* ---------- obsah na jedné straně (Chromium) ---------- */
async function chromium() {
  let pw = null;
  try { pw = require('playwright'); } catch (e) {
    try { pw = require(path.join(require('child_process').execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright')); } catch (e2) { pw = null; }
  }
  if (!pw) { preskoceno++; console.log('SKIP (c) obsah na jedné straně — Playwright není k dispozici'); return; }
  /* Příručka správce má víc kapitol (A1–A15 + 1–32) — když se vejde ona, vejde se i obchodník. */
  const kapitoly = OBSAH_A.kapitoly.concat(OBSAH.kapitoly).map(k => ({ id: k.id, nadpis: k.nadpis, bloky: [] }));
  const data = { titul: OBSAH_A.titul, verze: OBSAH_A.verze, uvod: [], kapitoly };
  const snimky = { css: '', snimky: [], verze: 'x', prostredi: 'test' };
  const html = SABLONA.replace('__SNIMKY__', JSON.stringify(snimky)).replace('__OBSAH__', JSON.stringify(data));
  const prohl = await pw.chromium.launch();
  try {
    /* Tisková plocha A4 při 96 dpi: šířka 210 − 2 × 12 mm = 702 px, výška
     * 297 − 2 × 14 mm = 1 016 px (@page v šabloně). Rozvržení v tiskovém
     * režimu na téhle šířce = rozvržení stránky v PDF. */
    const str = await prohl.newPage({ viewport: { width: 702, height: 1016 } });
    await str.emulateMedia({ media: 'print' });
    await str.setContent(html, { waitUntil: 'load' });
    const r = await str.evaluate(() => {
      const o = document.getElementById('obsah');
      return { dole: Math.ceil(o.getBoundingClientRect().bottom + window.scrollY), polozek: o.querySelectorAll('li').length };
    });
    test('(c) obsah příručky správce (' + r.polozek + ' kapitol) se v tisku A4 vejde na jednu stranu (konec ' + r.dole + ' px z 1 016)',
      r.polozek === kapitoly.length && r.dole <= 1016, r);
  } finally { await prohl.close(); }
}

chromium().catch(e => { fail++; console.log('FAIL (c) Chromium: ' + e.message); }).finally(() => {
  console.log('\n' + ok + ' prošlo, ' + fail + ' selhalo' + (preskoceno ? ', ' + preskoceno + ' přeskočeno' : ''));
  process.exit(fail ? 1 : 0);
});
