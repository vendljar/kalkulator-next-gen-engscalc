/* KOKPIT KOORDINACE — vykreslení bez vložení HTML z dat (K4-N21, O9, 21. 10. 2026).
 *
 * Šablona .claude/skills/kokpit-koordinace/kokpit_sablona.html skládá stránku
 * přes innerHTML. Texty jdou přes esc(), ale stav dlaždice (t.s), stav sezení
 * (s.stav) a čísla (kontext, tokeny, fáze) šly do atributu class / do HTML
 * bez escapu. Data píše jen koordinace, přesto: podvržená data s uvozovkou
 * v t.s / s.stav a HTML v číslech nesmí přidat atribut ani prvek.
 * Pojistka proti prázdnému testu: KOKPIT_SABLONA=<starší šablona> → selže
 * (před opravou 5 ✕, po opravě 0).
 * Spuštění: node overit_kokpit.mjs */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_kokpit.mjs');
  process.exit(2);
}

const KOREN = path.dirname(fileURLToPath(import.meta.url));
const SABLONA = process.env.KOKPIT_SABLONA || path.join(KOREN, '.claude/skills/kokpit-koordinace/kokpit_sablona.html');
let ok = 0, fail = 0;
const zkus = (popis, podminka, detail) => {
  if (podminka) { ok++; console.log('  ✓ ' + popis); }
  else { fail++; console.log('  ✕ ' + popis + (detail === undefined ? '' : '  → ' + detail)); }
};

const html = fs.readFileSync(SABLONA, 'utf8');
const ZNACKA = '<script id="data" type="application/json">';
const a = html.indexOf(ZNACKA) + ZNACKA.length, b = html.indexOf('</script>', a);
const data = JSON.parse(html.slice(a, b));
const UTOK = 'ok" data-utok="1" onmouseover="window.__xss=1';
const HTML_UTOK = '<img data-utok="2" src="x" onerror="window.__xss=2">';
data.dlazdice = [{ k: 'dlaždice', v: '1', d: 'popis', s: UTOK }];
data.sezeni = [Object.assign({}, data.sezeni[0] || {}, {
  nazev: 'Podvržené sezení', stav: UTOK, stavText: 'běží', role: 'test', id: 'session_x', co: 'nic', dalsi: 'nic',
  eta: '1 h', kontext: HTML_UTOK, kontextTok: HTML_UTOK, faze: '0<b data-utok="3">x</b>' })];
const stranka = html.slice(0, a) + JSON.stringify(data).replace(/</g, '\\u003c') + html.slice(b);

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const p = await prohlizec.newPage();
const chyby = [];
p.on('pageerror', e => chyby.push(String(e)));
await p.setContent(stranka, { waitUntil: 'load' });
await p.waitForTimeout(300);
const r = await p.evaluate(() => ({
  utok: document.querySelectorAll('[data-utok]').length,
  handler: document.querySelectorAll('[onmouseover],[onerror]').length,
  xss: window.__xss || 0,
  dlazdice: (document.querySelector('#tiles .tile') || {}).className || '',
  radek: (document.querySelector('#board .row') || {}).className || '',
  pill: (document.querySelector('#board .pill') || {}).className || '',
  ctx: (document.querySelector('#board .ctx') || {}).textContent || '',
}));
zkus('stránka se vykreslí bez chyby skriptu', chyby.length === 0, chyby.join(' | '));
zkus('žádný podvržený atribut ani prvek (data-utok)', r.utok === 0, r.utok);
zkus('žádná obsluha události z dat (onmouseover / onerror)', r.handler === 0 && r.xss === 0, JSON.stringify(r));
zkus('neznámý stav dlaždice → bezpečná třída „idle“', r.dlazdice === 'tile idle', r.dlazdice);
zkus('neznámý stav sezení → řádek i štítek jako „idle“', r.radek === 'row r-idle' && r.pill === 'pill p-idle', r.radek + ' / ' + r.pill);
zkus('nečíselný kontext → „kontext ?“', /kontext \?/.test(r.ctx), r.ctx);

/* Běžná data se vykreslí jako dřív (ok / warn / run, čísla). */
const p2 = await prohlizec.newPage();
await p2.setContent(html, { waitUntil: 'load' });
await p2.waitForTimeout(300);
const r2 = await p2.evaluate(() => ({
  tiles: [...document.querySelectorAll('#tiles .tile')].map(t => t.className),
  rows: [...document.querySelectorAll('#board .row')].map(t => t.className),
  ctx: [...document.querySelectorAll('#board .ctx .mono')].map(t => t.textContent),
}));
zkus('skutečná data: třídy dlaždic beze změny', r2.tiles.length > 0 && r2.tiles.every(t => /^tile (ok|warn|run|bad)$/.test(t)), r2.tiles.join(','));
zkus('skutečná data: řádky sezení beze změny', r2.rows.length > 0 && r2.rows.every(t => /^row r-(ok|warn|run|bad|idle)$/.test(t)), r2.rows.join(','));
zkus('skutečná data: kontext s procenty', r2.ctx.some(t => /kontext \d+ %/.test(t)), r2.ctx.join(','));

await prohlizec.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
