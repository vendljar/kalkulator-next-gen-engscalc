/* FALEŠNÉ „NEULOŽENÉ ZMĚNY" A ULOŽENÍ BEZ ČÍSLA (kolo 16, dávka B — P5;
 * nálezy K14-N65, K14-N62, K15-N69; 25. 9. 2026).
 *
 * Co se hlídá (každý bod bez opravy selhal):
 *   1) Nová zakázka se nesmí tvářit, že má neuložené změny. `novaZakazkaUI()`
 *      neposouvala otisk „naposledy uloženo" (`HIST.ulozenoJako`), takže se
 *      čerstvá prázdná zakázka porovnávala s tou PŘEDCHOZÍ — lišila se id
 *      varianty a klíčem protokolu, `historieNeulozeno()` vracelo true
 *      a prohlížeč při zavření okna varoval před ztrátou změn, které nikdo
 *      neudělal. Stejně tak dialog „Otevřít jinou zakázku".
 *   2) Razítko platného ceníku, které aplikace sama vtiskne otevřené
 *      zakázce (`progSrovnejNedotcene` po zveřejnění nebo načtení ceníku),
 *      není změna uživatele. Do opravy se po zveřejnění nového ceníku
 *      rozpracovaná zakázka hlásila jako neuložená.
 *   3) Ruční uložení bez čísla nabídky se odmítne. `onlineUloz()` bral
 *      zakázku bez čísla a server ji založil jako „bez-cisla-….json" —
 *      záznam, který v seznamu nikdo nenajde a po doplnění čísla zůstane
 *      ležet jako sirotek. Totéž hlídá autosave u zakázky, které někdo
 *      číslo vymazal.
 *
 * Běží proti SKUTEČNÝM serverovým funkcím nad paměťovým úložištěm.
 * Spuštění: ADMIN_EMAIL=spravce@priklad.cz node overit_neulozene.mjs
 * (nastroje/pred_pushem.sh i spust_testy.sh proměnnou nastaví samy). */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-pro-neulozene-zmeny';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
  async seznam(p) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (p || ''))).map(x => x.slice(nazev.length + 1));
  },
});

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import zdravi from './netlify/functions/zdravi.mjs';
import ja from './netlify/functions/ja.mjs';
import prihlaseni from './netlify/functions/prihlaseni.mjs';
import uzivatele from './netlify/functions/uzivatele.mjs';
import programF from './netlify/functions/program.mjs';
import zakazky from './netlify/functions/zakazky.mjs';
import firma from './netlify/functions/firma.mjs';
import zobrazeni from './netlify/functions/zobrazeni.mjs';
import zakaznici from './netlify/functions/zakaznici.mjs';
import sablony from './netlify/functions/sablony.mjs';
import analytika from './netlify/functions/analytika.mjs';
import popisy from './netlify/functions/popisy.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const FUNKCE = { '/api/zdravi': zdravi, '/api/ja': ja, '/api/prihlaseni': prihlaseni,
  '/api/uzivatele': uzivatele, '/api/program': programF, '/api/zakazky': zakazky,
  '/api/firma': firma, '/api/zobrazeni': zobrazeni, '/api/zakaznici': zakaznici,
  '/api/sablony': sablony, '/api/analytika': analytika, '/api/popisy': popisy };

const html = readFileSync('dist/kalkulacka.html');
const server = createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const b = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
const page = await ctx.newPage();
const chyby = []; page.on('pageerror', e => chyby.push(String(e)));
let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request(); const url = new URL(r.url());
  const fn = FUNKCE[url.pathname];
  if (!fn) return route.fulfill({ status: 404, body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar } };
  if (r.method() === 'POST') init.body = r.postData() || '';
  const odp = await fn(new Request(r.url(), init));
  const setc = odp.headers.get('set-cookie');
  if (setc) cookieJar = setc.split(';')[0];
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: await odp.text() });
});

/* Dialogy aplikace (src/ui/dialog.js) se nahradí záznamníkem: text se
 * zapamatuje a odpoví se „ano". Na znění dialogů se tu testuje. */
const dlgStub = () => page.evaluate(() => {
  window.__dlg = [];
  window.potvrd = (t) => { window.__dlg.push(String(t)); return Promise.resolve(true); };
  window.hlaska = (t) => { window.__dlg.push(String(t)); return Promise.resolve(); };
  window.dotaz = (t, v) => { window.__dlg.push(String(t)); return Promise.resolve(v == null ? '' : v); };
});
const dlgPosledni = () => page.evaluate(() => (window.__dlg || []).slice(-1)[0] || '');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK   ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : (typeof info === 'string' ? info : JSON.stringify(info))); }
};
/* Co se od otisku liší — do výpisu selhání, ať je vidět PROČ. */
const rozdil = () => page.evaluate(() => {
  const out = [];
  let a; try { a = JSON.parse(HIST.ulozenoJako || 'null'); } catch (e) { return ['otisk nečitelný']; }
  const projdi = (x, y, c) => {
    if (JSON.stringify(x) === JSON.stringify(y) || out.length > 6) return;
    if (x && y && typeof x === 'object' && typeof y === 'object') {
      new Set([...Object.keys(x), ...Object.keys(y)]).forEach(k => projdi(x[k], y[k], c + '.' + k)); return;
    }
    out.push(c);
  };
  projdi(a, JSON.parse(JSON.stringify(ZAK)), 'ZAK');
  return out;
});
const neulozeno = () => page.evaluate(() => historieNeulozeno());
const rejstrik = () => page.evaluate(() => (ONLINE_STAV.rejstrik || []).map(z => z.soubor));
const pockej = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 10000 }).catch(() => {});

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.fill('#onlineEmail', 'spravce@priklad.cz');
await page.fill('#onlineHeslo', 'Zkusebni.Heslo.123');
await page.click('#prihlaseni-box >> text=Přihlásit');
await pockej(() => { try { return !!ONLINE_STAV.ja && !ONLINE_STAV.pracuje; } catch (e) { return false; } });
await page.waitForTimeout(500);
await dlgStub();

console.log('\n1) start a zveřejnění ceníku (razítko ceníku není změna uživatele)');
test('po přihlášení zakázka nehlásí neuložené změny', !(await neulozeno()), await rozdil());
await page.evaluate(async () => {
  set('C.montazHodKc', 1234);
  await onlineZverejni('P5 — první verze');
});
await pockej(() => { try { return ONLINE_STAV.db && ONLINE_STAV.db.platny && ONLINE_STAV.db.platny.verze === 1 && !ONLINE_STAV.pracuje; } catch (e) { return false; } });
await page.waitForTimeout(400);
/* Ruční zásah do ceníku výš (`set`) je práce člověka — otisk se proto
 * posune, jako by ji uložil; zkouší se jen to, co udělá aplikace sama. */
await page.evaluate(() => { protokolZapisTed(); historieOznacUlozeno(); });
/* Druhá verze ceníku: jiná cena, aplikace ji otevřené zakázce vtiskne sama
 * (onlineZverejni → onlineNactiProgram → onlineTik → progPouzij). */
await page.evaluate(async () => {
  DEFAULT_CENIK.montazHodKc = 2345;
  aktivniVarianta(ZAK).data.cenik.montazHodKc = 2345;
  protokolZapisTed(); historieOznacUlozeno();
  await onlineZverejni('P5 — druhá verze');
});
await pockej(() => { try { return ONLINE_STAV.db.platny.verze === 2 && ONLINE_STAV.cenikPouzit && !ONLINE_STAV.pracuje; } catch (e) { return false; } });
await page.waitForTimeout(500);
const razitko = await page.evaluate(() => (aktivniVarianta(ZAK).data.cenikRazitko || {}).verze);
test('příprava: otevřená zakázka dostala razítko nové verze ceníku', razitko === 2, razitko);
test('razítko ceníku, které vtiskla aplikace, není neuložená změna (K14-N62)',
  !(await neulozeno()), await rozdil());
/* Aplikace přepočítává i tehdy, když člověk rozpracovanou práci MÁ —
 * pak se otisk posunout nesmí, jinak by o ni při zavření okna přišel. */
await page.evaluate(async () => {
  set('ZAK.nazevAkce', 'Rozepsáno před zveřejněním');
  DEFAULT_CENIK.montazHodKc = 3456;
  aktivniVarianta(ZAK).data.cenik.montazHodKc = 3456;
  await onlineZverejni('P5 — třetí verze');
});
await pockej(() => { try { return ONLINE_STAV.db.platny.verze === 3 && ONLINE_STAV.cenikPouzit && !ONLINE_STAV.pracuje; } catch (e) { return false; } });
await page.waitForTimeout(500);
test('rozepsaná práce se razítkem ceníku neschová — pořád je neuložená', await neulozeno());

console.log('\n2) nová zakázka');
await page.evaluate(() => { window.__dlg = []; return novaZakazkaUI(); });
await page.waitForTimeout(500);
const otazka1 = await dlgPosledni();
test('s rozepsanou prací se „Nová zakázka" ptá, že se neuložené změny ztratí',
  /Neuložené změny/.test(otazka1), otazka1);
test('nová prázdná zakázka nehlásí neuložené změny (K14-N65)', !(await neulozeno()), await rozdil());
await page.evaluate(() => { window.__dlg = []; return novaZakazkaUI(); });
await page.waitForTimeout(500);
const otazka2 = await dlgPosledni();
test('bez rozepsané práce se „Nová zakázka" neptá na neuložené změny, které nejsou',
  !!otazka2 && !/Neuložené změny/i.test(otazka2), otazka2);
test('a po druhé nové zakázce se pořád nic neuložené nehlásí', !(await neulozeno()), await rozdil());

console.log('\n3) uložení bez čísla nabídky');
await page.evaluate(() => { set('ZAK.nazevAkce', 'Akce bez čísla'); });
const bez = await page.evaluate(async () => {
  const v = await onlineUloz();
  return { v, hlaska: ONLINE_STAV.hlaska, soubor: ONLINE_STAV.soubor };
});
test('ruční uložení bez čísla nabídky se odmítne (K15-N69)', bez.v === false && !bez.soubor, bez);
test('hláška řekne proč a co udělat', /čísl/i.test(bez.hlaska) && /hlavič/i.test(bez.hlaska), bez.hlaska);
test('v databázi nevznikl záznam „bez-cisla-…"', !(await rejstrik()).some(s => /^bez-cisla-/.test(s)), await rejstrik());

/* S číslem se uloží normálně. */
const s = await page.evaluate(async () => {
  set('ZAK.cislo', '2026 - OPR - CN - 0781');
  const v = await onlineUloz();
  return { v, soubor: ONLINE_STAV.soubor };
});
test('s vyplněným číslem se zakázka uloží', s.v === true && s.soubor === '2026-OPR-CN-0781.json', s);
test('uložená zakázka nehlásí neuložené změny', !(await neulozeno()), await rozdil());

/* Vymazané číslo u uložené zakázky: autosave se nesmí rozjet do nového
 * souboru „bez-cisla-…" (starý soubor by zůstal s původním obsahem). */
await page.evaluate(() => { ONLINE_STAV.zmenaUzivatele = true; set('ZAK.cislo', ZAK_CISLO_PREDLOHA); });
await page.waitForTimeout(3500);
test('po vymazání čísla autosave nic nezapsal', !(await rejstrik()).some(x => /^bez-cisla-/.test(x)), await rejstrik());
const st = await page.evaluate(() => zakUlozeniStav());
test('lišta říká, že bez čísla se neukládá', st.stav === 'vyplnit' && /čísl/i.test(st.text), st);
const rucne = await page.evaluate(async () => ({ v: await onlineUloz(), hlaska: ONLINE_STAV.hlaska }));
test('ruční uložení s vymazaným číslem se odmítne taky', rucne.v === false && /čísl/i.test(rucne.hlaska), rucne);
test('ani potom v databázi „bez-cisla-…" není', !(await rejstrik()).some(x => /^bez-cisla-/.test(x)), await rejstrik());

test('žádná chyba JavaScriptu', chyby.length === 0, chyby.slice(0, 2).join(' | '));

await b.close(); server.close();
console.log('\n' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
