/* PD #733 / #728 / #732 (J. V. 23. 11. 2026, nález K53-N2) — kalkulace
 * založená webhookem Pipedrive, otevřená odkazem z dealu (?zakazka=),
 * v prohlížeči proti SKUTEČNÝM serverovým funkcím nad paměťovým úložištěm
 * a simulátoru Pipedrive (do sítě nic).
 *
 * Závod z provozu se vynutí: platný ceník nasazuje onlineTik odloženě, takže
 * se zakázka z odkazu otevřela dřív, než ceník platil — doplnila se z ceníku
 * ze sestavení (marže 0) a pozdější přepočet „rozdělané“ zakázky marži
 * a ceny dle nabídky chránil (zůstaly 0) a měnil desítky cen (#732).
 * Harness proto nasazení v onlineTik zadrží, dokud se zakázka neotevře.
 *
 * Kontroly: po otevření = Nová zakázka (ceník OCK i PROJ s marží a cenami
 * dle nabídky, zadání s výchozím zaškrtnutím); otevřena k úpravám (#728);
 * první uložení zapíše do protokolu jen ruční změnu (#732) a server příznak
 * pdCerstva zahodí; druhé otevření odkazem je zase jen ke čtení.
 * Pojistka: na 173ab6a (před opravou) padá marže, ceny dle nabídky, zadání,
 * zámek i protokol.
 * Spuštění: node overit_pd_cerstva.mjs (po sestavení dist/kalkulacka.html) */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-pro-overit-pd-cerstva';
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
  F[p] = (await import('./netlify/functions/' + m + '.mjs')).default;
const puvLog = console.log;
console.log = (...a) => { if (typeof a[0] === 'string' && a[0].startsWith('pd_webhook: ')) return; puvLog(...a); };
const webhook = (await import('./netlify/functions/pd_webhook.mjs')).default;
const SIM = await import('./netlify/lib/pipedrive_simulator.mjs');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const html = readFileSync('dist/kalkulacka.html');
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
const prihlas = async () => {
  await page.fill('#onlineEmail', 'spravce@priklad.cz'); await page.fill('#onlineHeslo', 'Zkusebni.Heslo.123');
  await page.click('#prihlaseni-box >> text=Přihlásit');
  await page.waitForFunction(() => { try { return !!ONLINE_STAV.ja; } catch (e) { return false; } }, null, { timeout: 10000 });
  await page.waitForTimeout(1500);
};
await page.goto(ADRESA); await page.waitForFunction(() => typeof window.render === 'function'); await stub(); await prihlas();
await page.evaluate(async () => { prepniTab('cenik'); set('C.marze', 0.3); set('PC.marze', 0.35); set('C.montazHodKc', 1234);
  set('C.priplatky.zabranyPadKc', 777); await onlineZverejni('pokus'); });
await page.waitForTimeout(1500);
const snimek = () => page.evaluate(() => { const d = aktivniVarianta(ZAK).data; return { cislo: ZAK.cislo, marze: d.cenik.marze, pmarze: d.proj.cenik.marze, hod: d.cenik.montazHodKc,
  zabrany: d.cenik.priplatky && d.cenik.priplatky.zabranyPadKc, zad: JSON.stringify(d.ock.zadani).length, cteni: typeof zamekCteniJe==='function' && zamekCteniJe(), prot: (ZAK.protokol||[]).length, autor: ZAK.autor }; });
await page.evaluate(() => { window.potvrd = () => Promise.resolve(true); return novaZakazkaUI(); }); await page.waitForTimeout(500);
const nova = await snimek();
const novaZad = await page.evaluate(() => JSON.parse(JSON.stringify(aktivniVarianta(ZAK).data)));
let ok = 0, fail = 0;
const test = (n, c, info) => { if (c) { ok++; console.log('OK   ' + n); } else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 500)); } };
test('příprava: Nová zakázka nese zveřejněnou marži a cenu dle nabídky', nova.marze === 0.3 && nova.pmarze === 0.35 && nova.zabrany === 777, nova);
const d = SIM.pdSimStav().data.dealy.find((x) => x.status === 'open' && x.org_id && x.person_id && /^CN-\d+ /.test(x.title));
const rw = await webhook(new Request('https://t/api/pd/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-kalkulator-klic': KLIC }, body: JSON.stringify({ dealId: d.id }) }));
const j = await rw.json();
test('webhook založí kalkulaci', rw.status === 200 && j.akce === 'zalozeno', [rw.status, j.akce]);
const otevriOdkazem = async () => {
  let pust; globalThis.__brana = new Promise(r => { pust = r; });
  await page.goto(ADRESA + '/?zakazka=' + encodeURIComponent(j.soubor)); await page.waitForFunction(() => typeof window.render === 'function'); await stub();
  /* ZÁVOD: nasazení platného ceníku v onlineTik se zadrží, dokud se zakázka neotevře. */
  await page.evaluate(() => { window.__povol = false; const puv = window.onlineTik; window.onlineTik = () => { if (window.__povol) return puv(); const db = ONLINE_STAV.db; ONLINE_STAV.db = null; try { puv(); } finally { ONLINE_STAV.db = db; } }; });
  pust(); globalThis.__brana = null;
  await page.waitForFunction(() => ONLINE_STAV.soubor && ONLINE_STAV.ja, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__povol = true; render(); }); await page.waitForTimeout(800);
};
await otevriOdkazem();
const wh = await snimek();
const whZad = await page.evaluate(() => JSON.parse(JSON.stringify(aktivniVarianta(ZAK).data)));
test('otevřena kalkulace z odkazu', wh.cislo === j.soubor.replace(/\.json$/, '') || /CN-/.test(wh.cislo), wh.cislo);
test('#733 marže OCK i PROJ = zveřejněný ceník (ne 0)', wh.marze === 0.3 && wh.pmarze === 0.35, wh);
test('#733 cena „dle nabídky“ = zveřejněný ceník', wh.zabrany === 777, wh.zabrany);
for (const k of ['cenik', 'cenikRada', 'cenikRucni', 'zadaniRucni'])
  test('#733 ' + k + ' = Nová zakázka', JSON.stringify(whZad[k]) === JSON.stringify(novaZad[k]));
test('#733 zadání OCK (výchozí zaškrtnutí) = Nová zakázka', JSON.stringify(whZad.ock.zadani) === JSON.stringify(novaZad.ock.zadani));
test('#733 ceník a zadání PROJ = Nová zakázka', JSON.stringify(whZad.proj) === JSON.stringify(novaZad.proj));
test('#728 z odkazu v dealu otevřena k úpravám', wh.cteni === false, wh.cteni);
const ulozeni = await page.evaluate(async () => { const p0 = (ZAK.protokol || []).length; set('ZAK.adresa', 'Ručně 1'); const u = await onlineUloz();
  return { u, pocet: (ZAK.protokol || []).length - p0, co: (ZAK.protokol || []).slice(p0).map(p => String(p.co).slice(0, 80)) }; });
test('#732 první uložení: v protokolu jen ruční změna (1 řádek)', ulozeni.u === true && ulozeni.pocet === 1, ulozeni);
const ulozena = JSON.parse(pamet.get('zakazky/z/' + j.soubor));
test('#733 po uložení server příznak zahodil, uložená marže = zveřejněná', ulozena.pdCerstva === undefined && ulozena.varianty[0].data.cenik.marze === 0.3);
await otevriOdkazem();
test('#728 uloženou kalkulaci otevře odkaz zase jen ke čtení', (await snimek()).cteni === true);
test('bez chyb na stránce', chyby.length === 0, chyby);
await b.close(); server.close();
console.log(`\n${ok} prošlo, ${fail} selhalo`);
process.exit(fail ? 1 : 0);
