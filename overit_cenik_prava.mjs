/* Kontrola v prohlížeči: CENÍK VARIANTY PODLE ROLE (B112, 29. 9. 2026).
 *
 * 21. kolo: obchodník z konzole prohlížeče zapsal set('C.marze', -0.1)
 * a běžně uložil — server zakázku přijal a cena nabídky OCK klesla o 25 %
 * bez schválení (ceník varianty hlídalo jen UI). Tady se ověřuje, že
 * podvrh odmítne server, obchodník hlášku uvidí u tlačítka „Uložit
 * zakázku" a že běžné uložení s ceníkem ze zveřejněné verze projde.
 *
 * Průchod jako overit_zaporne.mjs: pravé serverové funkce přes most
 * page.route nad paměťovým úložištěm, zkušební ceník zveřejněný na serveru.
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_cenik_prava.mjs */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-kontrolu-ceniku';
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
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_cenik_prava.mjs');
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
  slevy: { minMarze: 0.10, maxGlobalni: 1, stropy: { 'Obchodník': 0.05, 'Vedoucí': 0.15, 'Administrátor': 1 } }, poznamka: 'B112' }, cA)).json();
if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
const ru = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email: 'obchodnik.b112@priklad.cz', jmeno: 'Petr Zkušební', role: 'Obchodník', heslo: 'ObchodniHeslo1' }, cA)).json();
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
await page.fill('#onlineEmail', 'obchodnik.b112@priklad.cz');
await page.fill('#onlineHeslo', 'ObchodniHeslo1');
await page.click('#prihlaseni-box >> text=Přihlásit');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } }, null, { timeout: 10000 });
await page.waitForTimeout(500);

/* Zakázka jako v 21. kole: šachta 1,6 × 1,8 m, zdvih 9 m. Ceník PŘÍMO ze
 * serveru (po přihlášení ho aplikace nasadí sama — progPouzij). */
await page.evaluate(() => {
  ZAK = novaZakazka(); syncVarianta();
  Object.assign(Z, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, nastupiste: 4 });
  ZAK.cislo = '2026 - OPR - CN - 9811 - TEST'; ZAK.nazevAkce = 'TEST B112'; ZAK.objednatel = 'TEST – TESTOVACÍ ODBĚRATEL s.r.o.';
  prepniTab('kalk'); render();
});
await page.waitForTimeout(300);
test('prohlížeč je v roli obchodníka', await page.evaluate(() => NAST.jeAdmin === false && zobrazeniRole() === 'Obchodník'));
test('nová zakázka nese zveřejněnou přirážku 20 %', await page.evaluate(() => C.marze === 0.2), await page.evaluate(() => C.marze));

/* běžné uložení s ceníkem ze zveřejněné verze projde */
const ulozeno = () => [...pamet.keys()].some(k => k.startsWith('zakazky/z/') && k.includes('9811'));
await page.evaluate(() => zakUlozUI());
await page.waitForFunction(() => { try { return !ZAKULO_STAV.uklada; } catch (e) { return true; } });
await page.waitForTimeout(400);
test('obchodník uloží zakázku s ceníkem ze zveřejněné verze', ulozeno());
const cenaUlozena = () => JSON.parse(pamet.get([...pamet.keys()].find(k => k.startsWith('zakazky/z/') && k.includes('9811')))).varianty[0].data.cenik.marze;

/* podvrh z konzole: set('C.marze', -0.1) a běžné uložení */
await page.evaluate(() => { window.__dlgTexty = []; set('C.marze', -0.1); });
await page.waitForTimeout(200);
const cenaPodvrh = await page.evaluate(() => vypocetAkt().souhrn.zakladCena);
await page.evaluate(() => zakUlozUI());
await page.waitForFunction(() => { try { return !ZAKULO_STAV.uklada; } catch (e) { return true; } });
await page.waitForTimeout(500);
test('podvrh přirážky −10 % z konzole: server uloženou zakázku nezmění', cenaUlozena() === 0.2, { ulozeno: cenaUlozena(), cenaPodvrh });
const lista = await page.evaluate(() => { const e = document.querySelector('.zak-ulozeni'); return e ? e.textContent : ''; });
test('obchodník vidí odmítnutí serveru u tlačítka „Uložit zakázku" (Ceník varianty smí měnit jen …)',
  /Ceník varianty smí měnit jen/.test(lista), lista.slice(0, 200));
test('stránka neskončila chybou JavaScriptu', chyby.length === 0, chyby);

await prohlizec.close();
server.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
