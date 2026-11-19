/* KDO JE ONLINE — Nastavení → Uživatelé (#ON, zadání J. V. 19. 11. 2026)
 *
 * Skutečný klient proti skutečným serverovým funkcím (most jako
 * overit_online.mjs, úložiště v paměti). Ověřuje:
 *  · správce vidí sloupec „Naposledy aktivní" a zelenou tečku u účtu
 *    aktivního v posledních 5 minutách (sám sebe, kolegu před 3 min);
 *  · relativní text („právě teď", „před 3 min", datum) a přesný čas v title;
 *  · účet bez aktivity „—" bez tečky, účet aktivní před 2 dny bez tečky,
 *    odhlášený účet bez tečky;
 *  · obchodník sloupec ani tečku nevidí a údaj o aktivitě nedostane.
 * Pojistka proti prázdnému testu: kontroly „bez tečky" mají proti sobě
 * „s tečkou" ve stejné tabulce; před změnou harness padá (sloupec chybí).
 * Účty jsou smyšlené (@priklad.cz).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_on_online.mjs
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
  '/api/zakaznici': 'zakaznici', '/api/sablony': 'sablony', '/api/analytika': 'analytika',
  '/api/pd/stav': 'pd_stav', '/api/slovnik': 'slovnik', '/api/controlling': 'controlling',
  '/api/zaloha_vynuceno': 'zaloha_vynuceno', '/api/zaloha': 'zaloha',
})) FUNKCE[cesta] = (await import('./netlify/functions/' + soubor + '.mjs')).default;
const { aktivitaDobehni } = await import('./netlify/lib/sdilene.mjs');

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
const otevriUzivatele = async () => {
  await page.evaluate(() => { ONLINE_STAV.uzivateleNacteno = false; otevriNastaveni(); nastPanel('uzivatele'); });
  await page.waitForTimeout(500);
};
const radek = (email) => page.evaluate((e) => {
  const tr = [...document.querySelectorAll('#nastaveni-panel tr')].find(x => x.cells[0] && x.cells[0].textContent.includes(e));
  const td = tr && tr.querySelector('td.uz-aktivita');
  return td ? { text: td.textContent.replace(/\s+/g, ' ').trim(), title: td.getAttribute('title') || '',
    tecka: !!td.querySelector('.uz-online') } : null;
}, email);

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);

/* správce + účty */
await prihlas(process.env.ADMIN_EMAIL, 'Zkusebni.Heslo.123');
const zaloz = (email, role) => page.evaluate(([e, r]) => onlineApi('/api/uzivatele',
  { akce: 'zaloz', email: e, jmeno: 'Účet ON', role: r, heslo: 'ZkusebniHeslo1' }).then(o => o.ok), [email, role]);
test('založení obchodníka', await zaloz('obchodnik.on@priklad.cz', 'Obchodník'));
test('založení vedoucího', await zaloz('vedouci.on@priklad.cz', 'Vedoucí'));
test('založení účtu bez aktivity', await zaloz('nikdy.on@priklad.cz', 'Obchodník'));
test('založení účtu aktivního před 2 dny', await zaloz('stary.on@priklad.cz', 'Obchodník'));
test('založení odhlášeného účtu', await zaloz('odhlaseny.on@priklad.cz', 'Obchodník'));
const ted = Date.now();
const iso = (ms) => new Date(ms).toISOString();
pamet.set('aktivita/a/vedouci.on@priklad.cz', JSON.stringify({ kdy: iso(ted - 3 * 60000 - 5000) }));
pamet.set('aktivita/a/stary.on@priklad.cz', JSON.stringify({ kdy: iso(ted - 2 * 86400000 - 3600000) }));
pamet.set('aktivita/a/odhlaseny.on@priklad.cz', JSON.stringify({ kdy: iso(ted - 2 * 60000) }));
pamet.set('aktivita/o/odhlaseny.on@priklad.cz', JSON.stringify({ kdy: iso(ted - 60000) }));

await otevriUzivatele();
const panel = await page.locator('#nastaveni-panel').innerHTML();
test('správce: tabulka má sloupec „Naposledy aktivní"', panel.includes('Naposledy aktivní'));
const ja = await radek(process.env.ADMIN_EMAIL);
test('správce sám: zelená tečka a „právě teď"', ja && ja.tecka && /právě teď/.test(ja.text) && /online/.test(ja.text), ja);
const ved = await radek('vedouci.on@priklad.cz');
test('kolega aktivní před 3 min: tečka a „před 3 min"', ved && ved.tecka && /před 3 min/.test(ved.text), ved);
test('přesný čas je v title', ved && /^Naposledy aktivní \d{1,2}\. \d{1,2}\. \d{4} \d{1,2}:\d{2}:\d{2}$/.test(ved.title), ved);
const nikdy = await radek('nikdy.on@priklad.cz');
test('účet bez aktivity: „—" a bez tečky', nikdy && !nikdy.tecka && nikdy.text === '—', nikdy);
const stary = await radek('stary.on@priklad.cz');
test('účet aktivní před 2 dny: datum a bez tečky', stary && !stary.tecka && /^\d{1,2}\. \d{1,2}\. \d{4}$/.test(stary.text), stary);
const odh = await radek('odhlaseny.on@priklad.cz');
test('odhlášený účet: bez tečky, odhlášení v title', odh && !odh.tecka && /před 2 min/.test(odh.text) && /odhlášen/.test(odh.title), odh);
test('řádky s tečkou a bez tečky v jedné tabulce (pojistka)',
  (await page.locator('#nastaveni-panel .uz-online').count()) === 2);

/* obchodník nic nevidí */
await page.evaluate(() => { document.getElementById('nastaveni-overlay').style.display = 'none'; });
await page.evaluate(() => onlineOdhlas());
await page.waitForTimeout(500);
await prihlas('obchodnik.on@priklad.cz', 'ZkusebniHeslo1');
await otevriUzivatele();
const panelObch = await page.locator('#nastaveni-panel').innerHTML();
test('obchodník: v Nastavení není sloupec „Naposledy aktivní" ani tečka',
  !panelObch.includes('Naposledy aktivní') && !panelObch.includes('uz-online'), panelObch.slice(0, 300));
const stavObch = await page.evaluate(() => JSON.stringify(ONLINE_STAV.uzivatele || []) + JSON.stringify(ONLINE_STAV.ja || {}));
test('obchodník: klient údaj o aktivitě nedostal', !/posledniAktivita|"online"/.test(stavObch), stavObch.slice(0, 300));
const prime = await page.evaluate(() => fetch('/api/uzivatele').then(r => r.status));
test('obchodník: přímé volání výpisu účtů 403', prime === 403, prime);

test('za celý průchod nevznikla nečekaná chyba v konzoli', chyby.length === 0, chyby);
await prohlizec.close();
server.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
