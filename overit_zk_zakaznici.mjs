/* ZÁKAZNÍCI ZE ZAKÁZEK — obrazovka Zákazníci, jen administrátor (ZK #755,
 * J. V. 24. 11. 2026).
 *
 * Skutečný klient proti skutečným serverovým funkcím (most jako
 * overit_on_online.mjs, úložiště v paměti, ARES jen zástupný fetch).
 * Ověřuje: správce vidí tlačítko „Naplnit ze zakázek (ARES)…“, náhled
 * doběhne po kouscích a ukáže počty a důvody (založit / nesedí / už
 * existuje), do potvrzení nevznikne karta, po potvrzení vznikne jen karta,
 * která sedí, protokol se ukáže; obchodník tlačítko nevidí a přímé volání
 * dostane 403. Pojistka: před ZK harness padá (tlačítko ani funkce nejsou).
 * Smyšlené firmy a kontakty (@priklad.cz).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_zk_zakaznici.mjs
 */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-harness';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
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

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_on_online.mjs');
  process.exit(2);
}

const FUNKCE = {};
for (const [cesta, soubor] of Object.entries({
  '/api/zdravi': 'zdravi', '/api/funkce': 'funkce', '/api/ja': 'ja', '/api/prihlaseni': 'prihlaseni',
  '/api/odhlaseni': 'odhlaseni', '/api/uzivatele': 'uzivatele', '/api/program': 'program',
  '/api/zakazky': 'zakazky', '/api/firma': 'firma', '/api/zobrazeni': 'zobrazeni', '/api/popisy': 'popisy',
  '/api/zakaznici': 'zakaznici', '/api/pripominky': 'pripominky', '/api/sablony': 'sablony', '/api/analytika': 'analytika',
  '/api/pd/stav': 'pd_stav', '/api/slovnik': 'slovnik', '/api/controlling': 'controlling',
  '/api/zaloha_vynuceno': 'zaloha_vynuceno', '/api/zaloha': 'zaloha', '/api/zakaznici-ze-zakazek': 'zakaznici_ze_zakazek',
})) FUNKCE[cesta] = (await import('./netlify/functions/' + soubor + '.mjs')).default;
const { aktivitaDobehni } = await import('./netlify/lib/sdilene.mjs');
const { ARES_SIT } = await import('./netlify/lib/ares_server.mjs');
const { ZZ_NASTAVENI } = await import('./netlify/functions/zakaznici_ze_zakazek.mjs');
ZZ_NASTAVENI.cekej = async () => {};
ZZ_NASTAVENI.aresNaVolani = 1;   // náhled po kouscích i v prohlížeči
const ico = (base) => { const s = String(base).padStart(7, '0'); let sum = 0;
  for (let i = 0; i < 7; i++) sum += (+s[i]) * (8 - i); const z = sum % 11; return s + (z === 0 ? 1 : (z === 1 ? 0 : 11 - z)); };
const IA = ico(2000001), IB = ico(2000002), IG = ico(2000003);
const ARES = { [IA]: { obchodniJmeno: 'Sedící Stavby s.r.o.', sidlo: { textovaAdresa: 'Harnessová 5, 11000 Praha 1' } },
  [IB]: { obchodniJmeno: 'Úplně Jiná Firma a.s.', sidlo: { textovaAdresa: 'Jinde 1, 60200 Brno' } } };
let aresDotazu = 0;
ARES_SIT.fetch = async (url) => { aresDotazu++; const i = String(url).slice(-8); const d = ARES[i];
  return d ? new Response(JSON.stringify({ ico: i, ...d }), { status: 200 }) : new Response('{}', { status: 404 }); };
const zakazka = (soubor, hl) => pamet.set('zakazky/z/' + soubor, JSON.stringify({ cislo: soubor, uloRazitko: '2026-11-20T08:00:00.000Z',
  objednatel: hl[0], adresaObjednatele: hl[1], ico: hl[2], dic: '', kontakt: hl[3] || '', zastupci: {}, varianty: [] }));
zakazka('zk-h1', ['SEDÍCÍ STAVBY, spol. s r.o.', 'Harnessová 5, 110 00 Praha 1', IA, 'Harness Kontakt']);
zakazka('zk-h2', ['Beta Firma s.r.o.', 'Jinde 1, 602 00 Brno', IB]);
zakazka('zk-h3', ['Gé Existující a.s.', 'Kdesi 3, 120 00 Praha 2', IG]);
zakazka('zk-h4', ['Bez IČO s.r.o.', 'Nikde 1, 100 00 Praha 10', '']);
pamet.set('zakaznici/z/' + IG, JSON.stringify({ schema: 1, nazev: 'Gé Existující a.s.', ico: IG, autor: 'jiny@priklad.cz' }));

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info)); }
};

const html = readFileSync(path.resolve('dist/kalkulacka.html'));
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await prohlizec.newContext();
const page = await ctx.newPage();
const { hlidejHarness } = require('./nastroje/harness_hlidac.js');
hlidejHarness({ page, uklid: async () => { await prohlizec.close(); server.close(); } });

const chyby = [];
page.on('console', m => { const t = m.text();
  if (m.type() === 'error' && !/status of (401|403|400|409|429)/.test(t)) chyby.push('console: ' + t); });
page.on('pageerror', e => chyby.push('pageerror: ' + e.message));

let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request();
  const url = new URL(r.url());
  const fn = FUNKCE[url.pathname];
  if (!fn) { console.log('404 ' + url.pathname); return route.fulfill({ status: 404, body: '{"ok":false}' }); }
  const init = { method: r.method(), headers: { cookie: cookieJar } };
  if (r.method() === 'POST') { init.body = r.postData() || ''; init.headers['content-type'] = 'application/json'; }
  const odp = await fn(new Request(r.url(), init));
  await aktivitaDobehni();
  const setc = odp.headers.get('set-cookie');
  if (setc) cookieJar = setc.split(';')[0];
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: await odp.text() });
});

const prihlas = async (email, heslo) => {
  await page.fill('#onlineEmail', email);
  await page.fill('#onlineHeslo', heslo);
  await page.click('#prihlaseni-box >> text=Přihlásit');
  await page.waitForFunction((e) => { try { return ONLINE_STAV.ja && ONLINE_STAV.ja.email === e; } catch (x) { return false; } }, email);
  await page.waitForTimeout(300);
};
const otevriZakazniky = async () => {
  await page.evaluate(() => { ZAK_DB.nacteno = false; prepniTab('zakaznici'); });
  await page.waitForFunction(() => ZAK_DB.nacteno === true);
  await page.waitForTimeout(200);
};
const stranka = () => page.locator('#page-zakaznici').innerText();

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);
await page.evaluate(() => { window.__dlg = []; window.potvrd = (t) => { window.__dlg.push(String(t)); return Promise.resolve(true); }; });

await prihlas(process.env.ADMIN_EMAIL, 'Zkusebni.Heslo.123');
test('založení obchodníka', await page.evaluate(() => onlineApi('/api/uzivatele',
  { akce: 'zaloz', email: 'obchodnik.zk@priklad.cz', jmeno: 'Účet ZK', role: 'Obchodník', heslo: 'ZkusebniHeslo1' }).then(o => o.ok)));
await otevriZakazniky();
test('správce: tlačítko „Naplnit ze zakázek (ARES)…“', (await stranka()).includes('Naplnit ze zakázek (ARES)'));
await page.click('#page-zakaznici >> text=Naplnit ze zakázek (ARES)');
await page.waitForTimeout(300);
test('panel se otevře s vysvětlením', /název i sídlo z ARES sedí/.test(await stranka()));
await page.click('#page-zakaznici >> text=Spustit náhled');
await page.waitForFunction(() => ZAK_DB.hromadne && !ZAK_DB.hromadne.bezi && ZAK_DB.hromadne.navrh && ZAK_DB.hromadne.navrh.faze === 'hotovo', null, { timeout: 15000 });
await page.waitForTimeout(200);
const t1 = await stranka();
test('náhled: stav hotovo, počty a důvody', /Stav: hotovo/.test(t1) && /jiný název/.test(t1) && /karta s tímto IČO už existuje/.test(t1), t1.slice(0, 600));
test('náhled: bez IČO jen počet', /bez IČO 1/.test(t1), t1.slice(0, 600));
test('náhled po kouscích (2 dotazy do ARES, existující karta bez dotazu)', aresDotazu === 2, aresDotazu);
test('do potvrzení nevznikla karta', !pamet.has('zakaznici/z/' + IA));
await page.click('#page-zakaznici >> text=Založit 1 karet');
await page.waitForFunction(() => ZAK_DB.hromadne && !ZAK_DB.hromadne.bezi && !ZAK_DB.hromadne.navrh, null, { timeout: 10000 });
await page.waitForTimeout(500);
const dlg = await page.evaluate(() => window.__dlg.join('\n'));
test('potvrzení se ptá na počet karet', /Založit 1 karet zákazníků podle ARES/.test(dlg), dlg);
const karta = JSON.parse(pamet.get('zakaznici/z/' + IA) || 'null');
test('po potvrzení vznikla karta, která sedí (údaje ARES + kontakt)', karta && karta.nazev === 'Sedící Stavby s.r.o.' && karta.kontaktOsoba === 'Harness Kontakt', karta);
test('nesedící karta nevznikla', !pamet.has('zakaznici/z/' + IB));
await page.waitForFunction(() => ZAK_DB.nacteno === true, null, { timeout: 5000 }).catch(() => {});
const t2 = await stranka();
test('hláška a protokol', /Založeno karet: 1/.test(t2) && /Protokol/.test(t2) && /založeno 1/.test(t2), t2.slice(0, 800));

/* obchodník nic nevidí */
await page.evaluate(() => onlineOdhlas());
await page.waitForTimeout(500);
await prihlas('obchodnik.zk@priklad.cz', 'ZkusebniHeslo1');
await otevriZakazniky();
const t3 = await stranka();
test('obchodník: tlačítko ani panel nevidí', !t3.includes('Naplnit ze zakázek') && !t3.includes('Protokol'), t3.slice(0, 300));
test('obchodník: přímé volání 403', (await page.evaluate(() => fetch('/api/zakaznici-ze-zakazek').then(r => r.status))) === 403);
test('obchodník: přímý náhled 403', (await page.evaluate(() => fetch('/api/zakaznici-ze-zakazek', { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: '{"akce":"nahled"}' }).then(r => r.status))) === 403);

test('za celý průchod nevznikla nečekaná chyba v konzoli', chyby.length === 0, chyby);
await prohlizec.close();
server.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
