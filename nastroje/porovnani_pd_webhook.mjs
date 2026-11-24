/* K56 — #733 lokálně: kalkulace z webhooku Pipedrive vs. Nová zakázka, nad stromem KOREN
 * (main nebo test): skutečné serverové funkce nad paměťovým úložištěm, simulátor PD, dist z KOREN.
 * Vypíše JSON: snímek Nové zakázky, snímek kalkulace z odkazu a cenové symboly nabídky obou. */
const KOREN = require_koren();
function require_koren() { const k = process.env.KOREN || process.cwd(); return k.replace(/\/$/, ""); }
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-pro-k56-733';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
for (const k of ['PIPEDRIVE_SIMULATOR_SCENAR','PIPEDRIVE_TOKEN','PIPEDRIVE_DOMENA','PROSTREDI','NETLIFY','CONTEXT','URL']) delete process.env[k];
process.env.PIPEDRIVE_SIMULATOR = '1';
const KLIC = 'kng-test-webhook-klic-733-0123456789abcdefghijklm';
process.env.PIPEDRIVE_WEBHOOK_KLIC = KLIC;
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
  async seznam(p) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (p || ''))).map(x => x.slice(nazev.length + 1)); },
});
globalThis.fetch = async (u) => { throw new Error('síť zakázaná ' + u); };
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const F = {};
for (const [p, m] of [['/api/zdravi','zdravi'],['/api/ja','ja'],['/api/prihlaseni','prihlaseni'],['/api/uzivatele','uzivatele'],['/api/program','program'],['/api/zakazky','zakazky'],['/api/firma','firma'],['/api/zobrazeni','zobrazeni'],['/api/zakaznici','zakaznici'],['/api/sablony','sablony'],['/api/analytika','analytika'],['/api/funkce','funkce'],['/api/pd/stav','pd_stav']])
  F[p] = (await import(KOREN + '/netlify/functions/' + m + '.mjs')).default;
const puvLog = console.log;
console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('pd_webhook: ')) return; puvLog(...a); };
const webhook = (await import(KOREN + '/netlify/functions/pd_webhook.mjs')).default;
const SIM = await import(KOREN + '/netlify/lib/pipedrive_simulator.mjs');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const html = readFileSync(KOREN + '/dist/kalkulacka.html');
const server = createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;
const b = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
const chyby = []; page.on('pageerror', e => chyby.push(String(e)));
let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request(); const url = new URL(r.url()); const fn = F[url.pathname];
  if (url.pathname === '/api/ja' && globalThis.__brana) await globalThis.__brana;
  if (!fn) return route.fulfill({ status: 404, body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar } };
  if (r.method() === 'POST') init.body = r.postData() || '';
  const odp = await fn(new Request(r.url(), init));
  const setc = odp.headers.get('set-cookie'); if (setc) cookieJar = setc.split(';')[0];
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: await odp.text() });
});
const stub = () => page.evaluate(() => { window.potvrd = () => Promise.resolve(true); window.hlaska = () => Promise.resolve(); window.volba = (t, m) => Promise.resolve('zahodit');
  window.dotazHeslo = () => Promise.resolve('Zkusebni.Heslo.123'); });
await page.goto(ADRESA); await page.waitForFunction(() => typeof window.render === 'function'); await stub();
await page.fill('#onlineEmail', 'spravce@priklad.cz'); await page.fill('#onlineHeslo', 'Zkusebni.Heslo.123');
await page.click('#prihlaseni-box >> text=Přihlásit');
await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } }, null, { timeout: 10000 });
await page.waitForTimeout(1500);
await page.evaluate(async () => { prepniTab('cenik'); set('C.marze', 0.3); set('PC.marze', 0.35); set('C.montazHodKc', 1234);
  set('C.priplatky.zabranyPadKc', 777); await onlineZverejni('pokus'); });
await page.waitForTimeout(1500);
/* Snímek: marže, cena dle nabídky, cena nabídky OCK a cenové symboly nabídky (CZ). */
const snimek = () => page.evaluate(() => { const v = aktivniVarianta(ZAK), d = v.data; let cena = null, sym = {};
  try { const c = cenaNabidkyOck(vypocetAkt(), d.sleva, d.zaokrouhleni); cena = c && (c.cenaKc != null ? c.cenaKc : c); } catch (e) { cena = 'CHYBA ' + e.message; }
  try { const ph = nabidkaData(ZAK, v, JEKLY, 'cz').placeholders; Object.keys(ph).filter(k => /CENA|KC|CELKEM|SUMA|MARZ/i.test(k)).sort().forEach(k => { sym[k] = ph[k]; }); } catch (e) { sym = 'CHYBA ' + e.message; }
  return { marze: d.cenik.marze, pmarze: d.proj && d.proj.cenik && d.proj.cenik.marze, zabrany: d.cenik.priplatky && d.cenik.priplatky.zabranyPadKc,
    hod: d.cenik.montazHodKc, cena: JSON.stringify(cena), symboly: sym, cteni: typeof zamekCteniJe === 'function' ? zamekCteniJe() : null,
    zadani: JSON.stringify(d.ock.zadani), proj: JSON.stringify(d.proj) }; });
await page.evaluate(() => { window.potvrd = () => Promise.resolve(true); return novaZakazkaUI(); }); await page.waitForTimeout(500);
const nova = await snimek();
const d = SIM.pdSimStav().data.dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title));
const rw = await webhook(new Request('https://t/api/pd/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId: d.id }) }));
const j = await rw.json();
let pust; globalThis.__brana = new Promise(r => { pust = r; });
await page.goto(ADRESA + '/?zakazka=' + encodeURIComponent(j.soubor)); await page.waitForFunction(() => typeof window.render === 'function'); await stub();
/* Závod z provozu (viz overit_pd_cerstva.mjs): nasazení platného ceníku se zadrží, dokud se zakázka neotevře. */
await page.evaluate(() => { window.__povol = false; const puv = window.onlineTik; window.onlineTik = () => { if (window.__povol) return puv(); const db = ONLINE_STAV.db; ONLINE_STAV.db = null; try { puv(); } finally { ONLINE_STAV.db = db; } }; });
pust(); globalThis.__brana = null;
await page.waitForFunction(() => ONLINE_STAV.soubor && ONLINE_STAV.ja, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);
await page.evaluate(() => { window.__povol = true; render(); }); await page.waitForTimeout(800);
const wh = await snimek();
const vysl = { koren: KOREN, webhook: [rw.status, j.akce], nova, wh, chyby };
puvLog(JSON.stringify(vysl));
await b.close(); server.close(); process.exit(0);
