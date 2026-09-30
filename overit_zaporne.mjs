/* Kontrola v prohlížeči: ZÁPORNÁ VLASTNÍ POLOŽKA (B111, 29. 9. 2026).
 *
 * 21. kolo: obchodník v běžném UI klikl „+ přidat položku", do ceny napsal
 * −302167 a cena nabídky OCK spadla z 980 000 na 617 000 Kč bez schválení
 * (PROJ „+ přidat fixní položku" −90 400 → 271 200 → 162 720 Kč). Tady se
 * ověřuje, že je oprava zapojená do sestavené aplikace: pole mají min="0",
 * záporné číslo se odmítne s hláškou a cena se nezmění — a že podvrh
 * z konzole (zápis mimo UI) odmítne server a obchodník to uvidí.
 *
 * Průchod jako overit_role_nahled.mjs: pravé serverové funkce přes most
 * page.route nad paměťovým úložištěm, zkušební ceník.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_zaporne.mjs */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-kontrolu-zapornych';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || '')))
      .map(x => x.slice(nazev.length + 1));
  },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
import zdravi from './netlify/functions/zdravi.mjs';
import ja from './netlify/functions/ja.mjs';
import prihlaseni from './netlify/functions/prihlaseni.mjs';
import odhlaseni from './netlify/functions/odhlaseni.mjs';
import uzivatele from './netlify/functions/uzivatele.mjs';
import program from './netlify/functions/program.mjs';
import zakazky from './netlify/functions/zakazky.mjs';
import zaloha from './netlify/functions/zaloha.mjs';
import firma from './netlify/functions/firma.mjs';
import zobrazeni from './netlify/functions/zobrazeni.mjs';
import zalohaVynuceno from './netlify/functions/zaloha_vynuceno.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_zaporne.mjs');
  process.exit(2);
}
const ZC = require(path.resolve('src/zkusebni_cenik.js'));

const FUNKCE = {
  '/api/zdravi': zdravi, '/api/ja': ja, '/api/prihlaseni': prihlaseni,
  '/api/odhlaseni': odhlaseni, '/api/uzivatele': uzivatele,
  '/api/program': program, '/api/zakazky': zakazky, '/api/zaloha': zaloha,
  '/api/firma': firma, '/api/zobrazeni': zobrazeni, '/api/zaloha_vynuceno': zalohaVynuceno,
};

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

/* Účty a platný ceník se připraví přímo serverovými funkcemi (to není
 * předmětem kontroly) — prohlížeč pak přihlásí obchodníka. */
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));
const rA = await post(prihlaseni, 'http://x/api/prihlaseni', { email: process.env.ADMIN_EMAIL, heslo: 'Zkusebni.Heslo.123' });
const cA = (rA.headers.get('set-cookie') || '').split(';')[0];
const rp = await (await post(program, 'http://x/api/program', { cenik: ZC.zkusebniCenik(), cenikProj: ZC.zkusebniCenikProj(),
  slevy: { minMarze: 0.10, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'B111' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
const ru = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obchodnik.b111@priklad.cz', jmeno: 'Petr Zkušební', role: 'Obchodník', heslo: 'ObchodniHeslo1' }, cA)).json();
if (!ru.ok) throw new Error('uzivatel ' + JSON.stringify(ru));

const html = readFileSync(path.resolve('dist/kalkulacka.html'));
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await prohlizec.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
const chyby = [];
page.on('pageerror', e => chyby.push(String(e)));
let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request();
  const url = new URL(r.url());
  const fn = FUNKCE[url.pathname];
  if (!fn) return route.fulfill({ status: 404, body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar } };
  if (r.method() === 'POST') init.body = r.postData() || '';
  const odp = await fn(new Request(r.url(), init));
  const setc = odp.headers.get('set-cookie');
  if (setc) cookieJar = setc.split(';')[0];
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: await odp.text() });
});
const dlgStub = () => page.evaluate(() => {
  window.__dlgTexty = [];
  window.potvrd = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(true); };
  window.hlaska = (t) => { window.__dlgTexty.push(String(t)); return Promise.resolve(); };
  window.dotaz = (t, v) => { window.__dlgTexty.push(String(t)); return Promise.resolve(v == null ? '' : v); };
});
const dlgTexty = () => page.evaluate(() => (window.__dlgTexty || []).join(' | '));

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);
await dlgStub();
await page.fill('#onlineEmail', 'obchodnik.b111@priklad.cz');
await page.fill('#onlineHeslo', 'ObchodniHeslo1');
await page.click('#prihlaseni-box >> text=Přihlásit');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } }, null, { timeout: 10000 });
await page.waitForTimeout(500);

/* Zakázka jako v 21. kole: šachta 1,6 × 1,8 m, zdvih 9 m, zkušební ceník. */
await page.evaluate(([c, cp]) => {
  Object.assign(DEFAULT_CENIK, c); delete DEFAULT_CENIK.prazdny;
  Object.assign(DEFAULT_CENIK_PROJ, cp); delete DEFAULT_CENIK_PROJ.prazdny;
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  ZAK.cislo = '2026 - OPR - CN - 9801 - TEST'; ZAK.nazevAkce = 'TEST B111'; ZAK.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  prepniTab('kalk'); render();
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj()]);
await page.waitForTimeout(300);
test('prohlížeč je v roli obchodníka', await page.evaluate(() => NAST.jeAdmin === false && zobrazeniRole() === 'Obchodník'));
const cenaOck = () => page.evaluate(() => vypocetAkt().souhrn.zakladCena);
const cenaPred = await cenaOck();
test('výchozí cena OCK zkušební zakázky je 980 000 Kč', cenaPred === 980000, cenaPred);

/* ---------- OCK: „+ přidat položku" a záporná cena ---------- */
await page.evaluate(() => vlastniAdd('hrubaOck'));
await page.waitForTimeout(200);
const pole = page.locator(`input[onchange^="vlastniSet('hrubaOck', 0, 'cena'"]`).first();
test('pole ceny vlastní položky je vidět obchodníkovi', await pole.count() === 1);
test('pole ceny vlastní položky má min="0"', (await pole.getAttribute('min')) === '0', await pole.getAttribute('min'));
const poleMn = page.locator(`input[onchange^="vlastniSet('hrubaOck', 0, 'mnozstvi'"]`).first();
test('pole množství vlastní položky má min="0"', (await poleMn.count()) === 1 && (await poleMn.getAttribute('min')) === '0');
await pole.fill('-302167');
await pole.dispatchEvent('change');
await page.waitForTimeout(250);
const texty1 = await dlgTexty();
test('záporná cena → hláška, že částka nesmí být záporná (a odkaz na slevu)', /nemohou být záporné/.test(texty1) && /slev/.test(texty1), texty1);
test('cena vlastní položky zůstala 0', await page.evaluate(() => vlastniPolozkyArr('hrubaOck')[0].cena === 0));
test('cena nabídky OCK zůstala 980 000 Kč', (await cenaOck()) === 980000, await cenaOck());
await poleMn.fill('-1'); await poleMn.dispatchEvent('change'); await page.waitForTimeout(200);
test('záporné množství vlastní položky se také odmítne', await page.evaluate(() => vlastniPolozkyArr('hrubaOck')[0].mnozstvi === 1));
/* kladná částka dál jde (oprava neblokuje běžnou práci) */
await pole.fill('5000'); await pole.dispatchEvent('change'); await page.waitForTimeout(200);
test('kladná částka vlastní položky se zapíše', await page.evaluate(() => vlastniPolozkyArr('hrubaOck')[0].cena === 5000));

/* ---------- PROJ: „+ přidat fixní položku" a záporná částka ---------- */
await page.evaluate(() => { prepniTab('proj'); pjPolozkaAdd(0, 'fix'); render(); });
await page.waitForTimeout(250);
const j = await page.evaluate(() => PJ.sekce[0].polozky.length - 1);
const cenaProj = () => page.evaluate(() => vypocetProjAkt().souhrn.celkem);
const projPred = await cenaProj();
const poleP = page.locator(`input[onchange^="pjSet(0, 'polozky.${j}.cena'"]`).first();
test('pole částky vlastní položky PROJ je vidět a má min="0"', (await poleP.count()) === 1 && (await poleP.getAttribute('min')) === '0');
await page.evaluate(() => { window.__dlgTexty = []; });
await poleP.fill('-90400'); await poleP.dispatchEvent('change'); await page.waitForTimeout(250);
test('záporná částka PROJ → hláška a cena PROJ beze změny',
  /záporné/.test(await dlgTexty()) && (await cenaProj()) === projPred, { texty: await dlgTexty(), pred: projPred, po: await cenaProj() });

/* ---------- podvrh z konzole: server odmítne a obchodník to uvidí ---------- */
await page.evaluate(() => { prepniTab('kalk'); vlastniPolozkyArr('hrubaOck')[0].cena = -302167; render(); });
await page.evaluate(() => { window.__dlgTexty = []; });
const vysl = await page.evaluate(() => zakUlozUI().then(v => v, e => 'chyba: ' + e.message));
await page.waitForTimeout(500);
const ulozeno = [...pamet.keys()].some(k => k.startsWith('zakazky/z/') && k.includes('9801'));
const vidi = await page.evaluate(() => document.body.innerText + ' ' + (window.__dlgTexty || []).join(' '));
test('podvrh záporné ceny z konzole: server zakázku neuloží', !ulozeno, { vysl });
test('podvrh záporné ceny z konzole: obchodník vidí odmítnutí serveru („záporn")', /záporn/i.test(vidi), vidi.slice(0, 300));
test('stránka neskončila chybou JavaScriptu', chyby.length === 0, chyby);

await prohlizec.close();
server.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
