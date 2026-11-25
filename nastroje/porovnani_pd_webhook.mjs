/* K56 — #733 lokálně: kalkulace z webhooku Pipedrive vs. Nová zakázka, nad stromem KOREN
 * (main nebo test): skutečné serverové funkce nad paměťovým úložištěm, simulátor PD, dist z KOREN.
 * Vypíše JSON: snímek Nové zakázky, snímek kalkulace z odkazu a cenové symboly nabídky obou.
 * K56-D (25. 11. 2026, svěřené K56-5): snímek nese i Kontaktní osobu zakázky (#729) — jen jméno
 * (text bez e-mailu a telefonu) a příznaky „má e-mail“ / „má telefon“ / „= jméno osoby dealu“.
 *
 * Použití:
 *   KOREN=<strom s dist> node nastroje/porovnani_pd_webhook.mjs > a.json     (prohlížeč; NE souběžně)
 *   node nastroje/porovnani_pd_webhook.mjs --porovnej <a.json> <b.json> [--popis-a T] [--popis-b T]
 *        Porovná dva výstupy: v každé straně „kalkulace z webhooku = Nová zakázka“ po polích a strany
 *        mezi sebou. Vypíše JEN pole a shodu (✓/✗), žádné částky ani jména.
 *        Kód 0 = v B je kalkulace z webhooku ve všech cenových polích = Nová zakázka a kontakt bez
 *        e-mailu a telefonu; 1 = není (vada #733 / #729 v B); 2 = chybné použití. */
if (process.argv[2] === '--porovnej') porovnejVystupy(process.argv.slice(3));
function porovnejVystupy(argv) {
  const fs = createRequire(import.meta.url)('fs');
  const soubory = [], popis = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--popis-a' || argv[i] === '--popis-b') popis[argv[i].slice(-1)] = argv[++i];
    else if (argv[i].startsWith('--')) { console.error('neznámá volba: ' + argv[i]); process.exit(2); }
    else soubory.push(argv[i]);
  }
  if (soubory.length !== 2) { console.error('--porovnej chce dva soubory výstupu'); process.exit(2); }
  let A, B;
  try { [A, B] = soubory.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))); } catch (e) { console.error('nečitelný výstup: ' + e.message); process.exit(2); }
  if (![A, B].every(x => x && x.nova && x.wh)) { console.error('výstup nemá snímky nova/wh'); process.exit(2); }
  /* Cenová pole (#733) a ostatní; symboly po klíčích (bez NAZEV_AKCE — ten je z dealu) */
  const CENOVA = ['marze', 'pmarze', 'zabrany', 'hod', 'cena', 'symboly'];
  const POLE = CENOVA.concat(['zadani', 'proj']);
  const Z_DEALU = ['NAZEV_AKCE'];   // název akce je z dealu, ne z ceny (filtr symbolů ho chytí přes „KC“ v „AKCE“)
  const sym = x => { const o = (x && typeof x === 'object') ? Object.assign({}, x) : { '(chyba)': String(x) }; Z_DEALU.forEach(k => delete o[k]); return o; };
  const shodaPole = (x, y, k) => {
    if (k !== 'symboly') return JSON.stringify(x[k]) === JSON.stringify(y[k]);
    const a = sym(x[k]), b = sym(y[k]);
    return Object.keys(Object.assign({}, a, b)).every(q => a[q] === b[q]);
  };
  const jineSym = (x, y) => { const a = sym(x.symboly), b = sym(y.symboly); return Object.keys(Object.assign({}, a, b)).filter(q => a[q] !== b[q]).sort(); };
  const z = c => c ? '✓' : '✗';
  const r = [];
  r.push('POROVNÁNÍ KALKULACE Z WEBHOOKU (#733, #729) — jen pole a shoda, bez částek');
  r.push('  A = ' + (popis.a || soubory[0]) + '   B = ' + (popis.b || soubory[1]));
  r.push('');
  r.push('  pole                       A: webhook = Nová   B: webhook = Nová   webhook A = B');
  const radek = (jm, a, b, ab) => r.push('  ' + jm.padEnd(27) + String(a).padEnd(20) + String(b).padEnd(20) + ab);
  radek('webhook (stav, akce)', A.webhook && A.webhook.join(' '), B.webhook && B.webhook.join(' '), z(JSON.stringify(A.webhook) === JSON.stringify(B.webhook)));
  POLE.forEach(k => radek(k + (CENOVA.includes(k) ? ' (cena)' : ''), z(shodaPole(A.wh, A.nova, k)), z(shodaPole(B.wh, B.nova, k)), z(shodaPole(A.wh, B.wh, k))));
  const kont = x => x.wh && x.wh.kontakt || {};
  radek('kontakt: má e-mail', kont(A).maEmail ? 'ano ✗' : 'ne ✓', kont(B).maEmail ? 'ano ✗' : 'ne ✓', z(kont(A).maEmail === kont(B).maEmail));
  radek('kontakt: má telefon', kont(A).maTelefon ? 'ano ✗' : 'ne ✓', kont(B).maTelefon ? 'ano ✗' : 'ne ✓', z(kont(A).maTelefon === kont(B).maTelefon));
  radek('kontakt = jméno osoby', z(kont(A).jeJmenoOsoby), z(kont(B).jeJmenoOsoby), z(kont(A).jmeno === kont(B).jmeno));
  radek('otevřeno jen ke čtení', A.wh.cteni ? 'ano' : 'ne', B.wh.cteni ? 'ano' : 'ne', z(A.wh.cteni === B.wh.cteni));
  radek('chyby stránky', (A.chyby || []).length, (B.chyby || []).length, '');
  const ja = jineSym(A.wh, A.nova), jb = jineSym(B.wh, B.nova);
  if (ja.length || jb.length) {
    r.push('');
    if (ja.length) r.push('  A: symboly webhook ≠ Nová: ' + ja.join(', '));
    if (jb.length) r.push('  B: symboly webhook ≠ Nová: ' + jb.join(', '));
  }
  const vadaB = CENOVA.some(k => !shodaPole(B.wh, B.nova, k)) || kont(B).maEmail || kont(B).maTelefon || !(B.webhook && B.webhook[0] === 200);
  r.push('');
  r.push('Výsledek B: ' + (vadaB ? 'VADA — kalkulace z webhooku není Nová zakázka (#733) nebo kontakt nese e-mail/telefon (#729)' : 'kalkulace z webhooku = Nová zakázka, kontakt jen jméno'));
  console.log(r.join('\n'));
  process.exit(vadaB ? 1 : 0);
}
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
const snimekStrana = () => page.evaluate(() => { const v = aktivniVarianta(ZAK), d = v.data; let cena = null, sym = {};
  try { const c = cenaNabidkyOck(vypocetAkt(), d.sleva, d.zaokrouhleni); cena = c && (c.cenaKc != null ? c.cenaKc : c); } catch (e) { cena = 'CHYBA ' + e.message; }
  try { const ph = nabidkaData(ZAK, v, JEKLY, 'cz').placeholders; Object.keys(ph).filter(k => /CENA|KC|CELKEM|SUMA|MARZ/i.test(k)).sort().forEach(k => { sym[k] = ph[k]; }); } catch (e) { sym = 'CHYBA ' + e.message; }
  return { marze: d.cenik.marze, pmarze: d.proj && d.proj.cenik && d.proj.cenik.marze, zabrany: d.cenik.priplatky && d.cenik.priplatky.zabranyPadKc,
    hod: d.cenik.montazHodKc, cena: JSON.stringify(cena), symboly: sym, cteni: typeof zamekCteniJe === 'function' ? zamekCteniJe() : null,
    zadani: JSON.stringify(d.ock.zadani), proj: JSON.stringify(d.proj), kontakt: ZAK.kontakt }; });
/* #729: Kontaktní osoba — do snímku jde jen jméno (části textu bez e-mailu a telefonu) a příznaky
 * „má e-mail“ / „má telefon“; e-mail ani telefon se nikam nezapíšou. */
function kontaktSnimek(t) {
  const s = String(t == null ? '' : t), TEL = /\+?\d{3}\s?\d{3}\s?\d{3}/;
  return { jmeno: s.split(',').map(x => x.trim()).filter(x => x && !/@/.test(x) && !TEL.test(x)).join(', '),
    maEmail: /@/.test(s), maTelefon: TEL.test(s) };
}
const snimek = async () => { const x = await snimekStrana(); x.kontakt = kontaktSnimek(x.kontakt); return x; };
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
/* = jméno osoby dealu (simulátor), porovnané tady — jméno se jinam nevypisuje */
const osobaDealu = (SIM.pdSimStav().data.osoby || []).find((o) => o.id === d.person_id) || {};
if (wh.kontakt) wh.kontakt.jeJmenoOsoby = wh.kontakt.jmeno === [osobaDealu.first_name, osobaDealu.last_name].filter(Boolean).join(' ') && !wh.kontakt.maEmail && !wh.kontakt.maTelefon;
const vysl = { koren: KOREN, webhook: [rw.status, j.akce], nova, wh, chyby };
puvLog(JSON.stringify(vysl));
await b.close(); server.close(); process.exit(0);
