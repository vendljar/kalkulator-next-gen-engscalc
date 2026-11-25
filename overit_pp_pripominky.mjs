/* DÁVKA PP — PŘIPOMÍNKY: ZVĚTŠENÍ SNÍMKU (#780) A ZNAČKY NA SNÍMKU (#781), PROHLÍŽEČ
 * (rozhodnutí J. V. 25. 11. 2026)
 *
 * Skutečný klient proti skutečné funkci /api/pripominky (most jako
 * overit_pripominky.mjs, úložiště v paměti). Celá cesta:
 *  1) obchodník: v panelu je lákavé tlačítko „Zakroužkovat problém na snímku"
 *     a 📍 výběr prvku zůstává; miniatura otevře editor;
 *  2) editor přes celé okno: tah myší nakreslí rámeček, přepnutí na kroužek,
 *     kliknutí bez tahu nic nenakreslí, Zpět, Smazat vše, Esc = Zrušit (vrátí
 *     stav), Hotovo uloží; miniatura i tlačítko ukážou počet značek;
 *  3) odeslání: jde snímek z náhledu (ne čerstvý) a značky; server je uloží
 *     se snímkem ve správných promilích;
 *  4) správce: v detailu snímek s červenými značkami a větou „Obchodník
 *     vyznačil 2 vyznačená místa"; kliknutím zvětšení přes celé okno;
 *     kolečko přibližuje kolem kurzoru, +/−, Přizpůsobit, 1:1, tažení posune,
 *     značky se zvětšují s obrázkem, Esc zavře; snímek nezachytí editor ani zvětšení;
 *  5) žádné chyby v konzoli; bez externích knihoven (žádný požadavek mimo stránku).
 * Pojistka proti prázdnému testu: na ebca8ebd tlačítko #prip-vyznacit ani
 * zvětšení neexistují → harness FAIL hned v 1) — viz zpráva commitu.
 * Snímky obrazovek (smyšlená data) jen s KNG_PP_SNIMKY=1 do scratch adresáře
 * KNG_PP_CIL (výchozí /tmp/kng_pp_snimky). Účty jsou smyšlené (@priklad.cz).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_pp_pripominky.mjs */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-harness';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) {
    return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1));
  },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

import { createRequire } from 'module';
import { createServer } from 'http';
import { readFileSync, mkdirSync } from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_pp_pripominky.mjs'); process.exit(2); }
const SNIMKY = process.env.KNG_PP_SNIMKY === '1';
const CIL = (process.env.KNG_PP_CIL || '/tmp/kng_pp_snimky') + '/';

const FUNKCE = {};
for (const [cesta, soubor] of Object.entries({
  '/api/zdravi': 'zdravi', '/api/funkce': 'funkce', '/api/ja': 'ja', '/api/prihlaseni': 'prihlaseni',
  '/api/odhlaseni': 'odhlaseni', '/api/uzivatele': 'uzivatele', '/api/program': 'program',
  '/api/zakazky': 'zakazky', '/api/firma': 'firma', '/api/zobrazeni': 'zobrazeni', '/api/popisy': 'popisy',
  '/api/zakaznici': 'zakaznici', '/api/sablony': 'sablony', '/api/analytika': 'analytika',
  '/api/pd/stav': 'pd_stav', '/api/slovnik': 'slovnik', '/api/controlling': 'controlling',
  '/api/zaloha_vynuceno': 'zaloha_vynuceno', '/api/zaloha': 'zaloha', '/api/pripominky': 'pripominky',
})) FUNKCE[cesta] = (await import('./netlify/functions/' + soubor + '.mjs')).default;
const { aktivitaDobehni } = await import('./netlify/lib/sdilene.mjs');

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 400)); }
};

const html = readFileSync(path.resolve('dist/kalkulacka.html'));
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await prohlizec.newContext({ viewport: { width: 1366, height: 820 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const { hlidejHarness } = require('./nastroje/harness_hlidac.js');
hlidejHarness({ page, uklid: async () => { await prohlizec.close(); server.close(); } });

const chyby = [], cizi = [];
page.on('console', m => { const t = m.text();
  if (m.type() === 'error' && !/status of (401|403|400|404|409|429)/.test(t)) chyby.push('console: ' + t); });
page.on('pageerror', e => chyby.push('pageerror: ' + e.message));
page.on('dialog', d => d.dismiss());
page.on('request', r => { const u = r.url(); if (!u.startsWith(ADRESA) && !u.startsWith('data:') && !u.startsWith('blob:')) cizi.push(u); });

let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request();
  const url = new URL(r.url());
  const fn = FUNKCE[url.pathname];
  if (!fn) return route.fulfill({ status: 404, body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar } };
  if (r.method() !== 'GET') { init.body = r.postData() || ''; init.headers['content-type'] = 'application/json'; }
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
  await page.waitForTimeout(500);
};
const odhlas = async () => {
  await page.evaluate(() => { const o = document.getElementById('nastaveni-overlay'); if (o) o.style.display = 'none';
    if (typeof pripPanelZavri === 'function') pripPanelZavri(); });
  await page.evaluate(() => onlineOdhlas());
  await page.waitForTimeout(500);
};
const viditelny = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).display !== 'none'; }, sel);
const fotka = async (jmeno) => { if (SNIMKY) { mkdirSync(CIL, { recursive: true }); await page.screenshot({ path: CIL + jmeno }); } };
/* tah myší v podílech obrázku editoru */
const tah = async (x0, y0, x1, y1) => {
  const r = await page.locator('#prip-zn-obraz').boundingBox();
  await page.mouse.move(r.x + r.width * x0, r.y + r.height * y0);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * ((x0 + x1) / 2), r.y + r.height * ((y0 + y1) / 2), { steps: 4 });
  await page.mouse.move(r.x + r.width * x1, r.y + r.height * y1, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(80);
};
const pocetZnacek = () => page.evaluate(() => PRIP.zn ? PRIP.zn.znacky.length : -1);

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);

/* --- správce zapne funkci a založí obchodníka --- */
await prihlas(process.env.ADMIN_EMAIL, 'Zkusebni.Heslo.123');
await page.evaluate(() => onlineApi('/api/uzivatele', { akce: 'zaloz', email: 'obchodnik.pp@priklad.cz',
  jmeno: 'Petra Zkušební', role: 'Obchodník', heslo: 'ZkusebniHeslo1' }));
await page.evaluate(() => onlineApi('/api/pripominky', { akce: 'nastaveni', nastaveni: { zapnuto: true, role: ['Obchodník', 'Administrátor'] } }));
await odhlas();

/* --- 1) obchodník: panel --- */
await prihlas('obchodnik.pp@priklad.cz', 'ZkusebniHeslo1');
await page.click('#prip-fab');
await page.waitForFunction(() => !PRIP.nahledBezi && !!PRIP.nahled, null, { timeout: 8000 });
await page.waitForTimeout(150);
test('#781 panel: tlačítko „Zakroužkovat problém na snímku" je aktivní', await viditelny('#prip-vyznacit')
  && !(await page.isDisabled('#prip-vyznacit')) && /Zakroužkovat problém na snímku/.test(await page.locator('#prip-vyznacit').innerText()));
test('#781 panel: 📍 výběr prvku zůstává vedle', /nebo/.test(await page.locator('.prip-kde-jinak').innerText()) && await viditelny('#prip-misto'));
await fotka('01_panel.png');
await page.uncheck('#prip-snimek-chk');
await page.waitForTimeout(100);
test('#781 bez snímku nejde vyznačovat', await page.isDisabled('#prip-vyznacit'));
await page.check('#prip-snimek-chk');
await page.waitForFunction(() => !PRIP.nahledBezi && !!PRIP.nahled, null, { timeout: 8000 });

/* --- 2) editor --- */
await page.click('.prip-mini-obal');
await page.waitForTimeout(150);
test('#781 miniatura otevře editor přes celé okno', await viditelny('#prip-zn-editor')
  && await page.evaluate(() => { const r = document.getElementById('prip-zn-editor').getBoundingClientRect(); return r.width === innerWidth && r.height === innerHeight; }));
test('#781 editor: nástroje Rámeček (vybraný) a Kroužek, Zpět a Smazat zhasnuté', await page.locator('.prip-zn-nastroj.act').innerText() === '▭ Rámeček'
  && (await page.locator('.prip-zn-nastroj').count()) === 2 && await page.isDisabled('#prip-zn-zpet') && await page.isDisabled('#prip-zn-smaz'));
await tah(0.10, 0.20, 0.40, 0.50);
test('#781 tah myší nakreslil rámeček', await pocetZnacek() === 1 && (await page.locator('#prip-zn-svg rect').count()) === 2);
const z1 = await page.evaluate(() => PRIP.zn.znacky[0]);
test('#781 rámeček v promilích odpovídá tahu (±10 ‰)', z1.tvar === 'ramecek' && Math.abs(z1.x - 100) <= 10 && Math.abs(z1.y - 200) <= 10
  && Math.abs(z1.w - 300) <= 10 && Math.abs(z1.h - 300) <= 10, z1);
await page.click('.prip-zn-nastroj[data-tvar="kruh"]');
await tah(0.80, 0.70, 0.60, 0.15);           // tah zprava zdola doleva nahoru
test('#781 kroužek (tah opačným směrem)', await pocetZnacek() === 2 && (await page.locator('#prip-zn-svg ellipse').count()) === 2
  && await page.evaluate(() => { const z = PRIP.zn.znacky[1]; return z.tvar === 'kruh' && Math.abs(z.x - 600) <= 10 && Math.abs(z.y - 150) <= 10; }));
await page.mouse.click(...(await (async () => { const r = await page.locator('#prip-zn-obraz').boundingBox(); return [r.x + r.width * 0.5, r.y + r.height * 0.9]; })()));
test('#781 kliknutí bez tahu nic nenakreslí', await pocetZnacek() === 2);
await tah(0.05, 0.05, 0.2, 0.15);
test('#781 třetí značka', await pocetZnacek() === 3 && /3 vyznačená místa/.test(await page.locator('#prip-zn-pocet').innerText()));
await page.click('#prip-zn-zpet');
test('#781 Zpět odebere poslední', await pocetZnacek() === 2);
await page.keyboard.press('Control+z');
test('#781 Ctrl+Z odebere další', await pocetZnacek() === 1);
await page.click('.prip-zn-nastroj[data-tvar="kruh"]');
await tah(0.80, 0.70, 0.60, 0.15);
await fotka('02_editor.png');
await page.click('#prip-zn-hotovo');
await page.waitForTimeout(150);
test('#781 Hotovo: editor zavřený, panel zpět, 2 značky', !(await viditelny('#prip-zn-editor')) && await viditelny('#prip-panel')
  && await page.evaluate(() => PRIP.znacky.length) === 2);
test('#781 panel: „Upravit vyznačení — 2 vyznačená místa", miniatura se značkami', /Upravit vyznačení/.test(await page.locator('#prip-vyznacit').innerText())
  && /2 vyznačená místa/.test(await page.locator('#prip-vyznacit').innerText()) && (await page.locator('.prip-mini-obal svg.prip-znacky ellipse').count()) === 2);
/* Esc = Zrušit: rozpracované změny se zahodí */
await page.click('#prip-vyznacit');
await page.click('#prip-zn-smaz');
await tah(0.3, 0.3, 0.35, 0.35);
test('#781 v editoru po Smazat vše jen nová značka', await pocetZnacek() === 1);
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
test('#781 Esc zavře editor a vrátí původní 2 značky', !(await viditelny('#prip-zn-editor')) && await page.evaluate(() => PRIP.znacky.length) === 2
  && await viditelny('#prip-panel'));
/* zavření panelu značky nezahodí (snímek zůstane) */
await page.evaluate(() => pripPanelZavri());
await page.click('#prip-fab');
await page.waitForTimeout(150);
test('#781 zavření a otevření panelu značky ani snímek nezahodí', await page.evaluate(() => PRIP.znacky.length === 2 && !!PRIP.nahled && !PRIP.nahledBezi));
test('#781 snímek nezachytí editor ani zvětšení (vyřazené ze snímku)', await page.evaluate(() => {
  const k = pripSnimekPoriz.toString(); return k.includes('PRIP_ZN_ID') && k.includes('PRIP_ZOOM_ID'); }));

/* --- 3) odeslání --- */
await page.click('.prip-typ[data-typ="chyba"]');
await page.fill('#prip-text', 'Tlačítko Uložit zakázku je na menší obrazovce schované pod lištou — viz zakroužkované.');
const nahledPred = await page.evaluate(() => PRIP.nahled);
const znPred = await page.evaluate(() => JSON.stringify(PRIP.znacky));
await page.evaluate(() => { window.__snimku = 0; const p = window.pripSnimekPoriz;
  window.pripSnimekPoriz = function () { window.__snimku++; return p.apply(this, arguments); }; });
await page.click('#prip-odeslat');
await page.waitForSelector('.prip-dekujeme', { timeout: 8000 });
const id = await page.evaluate(() => PRIP.odeslano && PRIP.odeslano.id);
const ul = JSON.parse(pamet.get('pripominky_snimky/' + id) || 'null');
test('#781 s vyznačením se nový snímek nepořizuje (jde ten z náhledu)', await page.evaluate(() => window.__snimku) === 0);
test('#781 server uložil snímek z náhledu a obě značky beze změny', ul && ul.obrazek === nahledPred && JSON.stringify(ul.znacky) === znPred, ul && ul.znacky);
test('#781 záznam připomínky značky nenese', !/ramecek|kruh/.test(pamet.get('pripominky/p/' + id)));
test('#781 po odeslání se značky vynulují', await page.evaluate(() => PRIP.znacky.length === 0));
await odhlas();

/* --- 4) správce --- */
await prihlas(process.env.ADMIN_EMAIL, 'Zkusebni.Heslo.123');
await page.evaluate(() => pripominkySpravceOtevri());
await page.waitForTimeout(600);
await page.click(`tr[data-id="${id}"]`);
await page.waitForFunction((i) => PRIP.sp.snimky[i] && PRIP.sp.znacky[i], id, { timeout: 5000 });
await page.waitForTimeout(200);
test('#781 detail: snímek s červenými značkami (rámeček i kroužek)', (await page.locator('.prip-snimek svg.prip-znacky rect').count()) === 2
  && (await page.locator('.prip-snimek svg.prip-znacky ellipse').count()) === 2);
test('#781 detail: věta o vyznačených místech', /Obchodník vyznačil 2 vyznačená místa/.test(await page.locator('.prip-sp-detail').innerText()));
test('#780 detail: odznak „🔍 Zvětšit" a kurzor lupy', /Zvětšit/.test(await page.locator('.prip-snimek').innerText())
  && await page.evaluate(() => getComputedStyle(document.querySelector('.prip-snimek')).cursor === 'zoom-in'));
await fotka('03_spravce_detail.png');
await page.click('.prip-snimek');
await page.waitForFunction(() => document.getElementById('prip-zoom') && getComputedStyle(document.getElementById('prip-zoom')).display !== 'none'
  && PRIP_ZOOM.w > 0, null, { timeout: 4000 });
await page.waitForTimeout(100);
const st = () => page.evaluate(() => ({ s: PRIP_ZOOM.s, x: PRIP_ZOOM.x, y: PRIP_ZOOM.y, pct: document.getElementById('prip-zoom-pct').textContent,
  t: document.getElementById('prip-zoom-obsah').style.transform }));
const s0 = await st();
const plocha = await page.locator('#prip-zoom-plocha').boundingBox();
test('#780 zvětšení přes celé okno, snímek přizpůsobený ploše', await page.evaluate(() => { const r = document.getElementById('prip-zoom').getBoundingClientRect(); return r.width === innerWidth && r.height === innerHeight; })
  && await page.evaluate(() => { const o = document.getElementById('prip-zoom-obsah').getBoundingClientRect(), p = document.getElementById('prip-zoom-plocha').getBoundingClientRect();
    return o.width <= p.width && o.height <= p.height && (p.width - o.width < 30 || p.height - o.height < 30); }), s0);
test('#780 v zvětšení značky i rámeček místa', (await page.locator('#prip-zoom-obsah svg.prip-znacky ellipse').count()) === 2);
/* kolečko: přiblížení kolem kurzoru */
const bodX = plocha.x + plocha.width * 0.3, bodY = plocha.y + plocha.height * 0.4;
const podKurzorem = (z) => [(bodX - plocha.x - z.x) / z.s, (bodY - plocha.y - z.y) / z.s];
const pred = podKurzorem(s0);
await page.mouse.move(bodX, bodY);
await page.mouse.wheel(0, -300); await page.waitForTimeout(80);
await page.mouse.wheel(0, -300); await page.waitForTimeout(80);
const s1 = await st();
const po = podKurzorem(s1);
test('#780 kolečko nahoru přiblíží', s1.s > s0.s * 1.25 && parseInt(s1.pct, 10) === Math.round(s1.s * 100), [s0.s, s1.s, s1.pct]);
test('#780 bod pod kurzorem zůstal na místě (±1 px snímku)', Math.abs(pred[0] - po[0]) < 1 && Math.abs(pred[1] - po[1]) < 1, [pred, po]);
await page.mouse.wheel(0, 300); await page.waitForTimeout(80);
test('#780 kolečko dolů oddálí', (await st()).s < s1.s);
await page.click('#prip-zoom-vice');
const s2 = await st();
await page.click('#prip-zoom-mene');
test('#780 tlačítka + a − (krok 1,25×)', Math.abs(s2.s / (await st()).s - 1.25) < 1e-6);
await page.click('#prip-zoom >> text=1:1');
test('#780 1:1 = 100 %', (await st()).pct === '100 %');
/* posun tažením */
const s3 = await st();
await page.mouse.move(plocha.x + 400, plocha.y + 300);
await page.mouse.down();
await page.mouse.move(plocha.x + 300, plocha.y + 240, { steps: 5 });
await page.mouse.up();
const s4 = await st();
test('#780 tažení posune o dráhu myši', Math.abs((s4.x - s3.x) + 100) < 1.5 && Math.abs((s4.y - s3.y) + 60) < 1.5 && s4.s === s3.s, [s3, s4]);
test('#780 značky se zvětšují s obrázkem (SVG = velikost obrázku)', await page.evaluate(() => {
  const i = document.getElementById('prip-zoom-img').getBoundingClientRect(), s = document.querySelector('#prip-zoom-obsah svg').getBoundingClientRect();
  return Math.abs(i.width - s.width) < 1 && Math.abs(i.height - s.height) < 1 && Math.abs(i.left - s.left) < 1; }));
for (let i = 0; i < 20 && !(await page.isDisabled('#prip-zoom-vice')); i++) await page.click('#prip-zoom-vice');
test('#780 strop 800 %, tlačítko + zhasne', (await st()).pct === '800 %' && await page.isDisabled('#prip-zoom-vice'));
await page.click('#prip-zoom >> text=Přizpůsobit');
test('#780 Přizpůsobit vrátí celý snímek', Math.abs((await st()).s - s0.s) < 1e-9);
await fotka('04_zvetseni.png');
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
test('#780 Esc zavře zvětšení, detail zůstane', !(await viditelny('#prip-zoom')) && await viditelny('.prip-sp-detail'));
await page.focus('.prip-snimek');
await page.keyboard.press('Enter');
await page.waitForTimeout(150);
test('#780 Enter na snímku otevře zvětšení (klávesnice)', await viditelny('#prip-zoom'));
await page.click('#prip-zoom-zavrit');
test('#780 ✕ Zavřít zavře', !(await viditelny('#prip-zoom')));

/* odhlášení zavře zvětšení i editor */
await page.click('.prip-snimek');
await page.waitForTimeout(150);
await odhlas();
test('reset po odhlášení: zvětšení zavřené, snímky a značky správce pryč', !(await viditelny('#prip-zoom'))
  && await page.evaluate(() => Object.keys(PRIP.sp.snimky).length === 0 && Object.keys(PRIP.sp.znacky).length === 0));

test('žádné chyby v konzoli', chyby.length === 0, chyby);
test('žádný požadavek mimo stránku (bez externích knihoven)', cizi.length === 0, cizi);
await prohlizec.close();
server.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
