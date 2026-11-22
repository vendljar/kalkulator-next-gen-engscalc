/* PŘIPOMÍNKY Z APLIKACE — PROHLÍŽEČ (dávka PR, zadání J. V. 21. 11. 2026)
 *
 * Skutečný klient proti skutečným serverovým funkcím (most jako
 * overit_on_online.mjs, úložiště v paměti). Celá cesta:
 *  1) správce zapne funkci; obchodník vidí plovoucí tlačítko „Připomínka";
 *  2) panel: Odeslat je neaktivní bez typu a textu; typ mění placeholder;
 *  3) „Ukázat místo": panel se schová, lišta nahoře, rámeček pod myší,
 *     klik prvek NEAKTIVUJE (záložka se nepřepne), čip „📍 Sekce › Popisek";
 *  4) snímek obrazovky: miniatura JPEG (SVG foreignObject → canvas, bez knihoven);
 *  5) odeslání → „Děkujeme" + P-0001 + Co bude dál;
 *  6) správce: tlačítko v liště s počtem, záložka „💬 Připomínky (1)" za
 *     Uživateli, nepřečtený řádek, detail se snímkem a vyznačeným místem,
 *     odložení bez zdůvodnění odmítne, „Odpovědět a uzavřít" projde;
 *  7) autor: číslo na tlačítku, karta zvýrazněná s odpovědí, po otevření
 *     přečteno (číslo zmizí);
 *  8) XSS v textu připomínky se nespustí ani u správce, ani u autora.
 * Pojistka proti prázdnému testu: před dávkou PR tlačítko ani panel nejsou
 * (harness padá na 1)); kontroly „neaktivní" mají vedle sebe „aktivní".
 * Snímky obrazovek (smyšlená data) jen s KNG_PR_SNIMKY=1 do
 * podklady/pripominky_snimky/ — běžné kolo je nepřepisuje.
 * Účty jsou smyšlené (@priklad.cz).
 *
 * Spuštění: NODE_PATH=$(npm root -g) node overit_pripominky.mjs
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
import { readFileSync, mkdirSync } from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_pripominky.mjs');
  process.exit(2);
}
const SNIMKY = process.env.KNG_PR_SNIMKY === '1';
const CIL = path.resolve('podklady/pripominky_snimky') + '/';

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
const ctx = await prohlizec.newContext({ viewport: { width: 1366, height: 820 }, deviceScaleFactor: SNIMKY ? 2 : 1 });
const page = await ctx.newPage();
const { hlidejHarness } = require('./nastroje/harness_hlidac.js');
hlidejHarness({ page, uklid: async () => { await prohlizec.close(); server.close(); } });

const chyby = [];
page.on('console', m => { const t = m.text();
  if (m.type() === 'error' && !/status of (401|403|400|404|409|429)/.test(t)) chyby.push('console: ' + t); });
page.on('pageerror', e => chyby.push('pageerror: ' + e.message));
page.on('dialog', d => d.dismiss());

let cookieJar = '';
let pozadavkuPrip = 0;   // NN #712: požadavky na /api/pripominky
await page.route('**/api/**', async route => {
  const r = route.request();
  const url = new URL(r.url());
  if (url.pathname === '/api/pripominky') pozadavkuPrip++;
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

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);

/* --- správce zapne funkci a založí obchodníka --- */
pozadavkuPrip = 0;
await prihlas(process.env.ADMIN_EMAIL, 'Zkusebni.Heslo.123');
test('správce: bez zapnutí plovoucí tlačítko není', !(await viditelny('#prip-fab')));
/* NN #712 (PR-I1): při VYP po přihlášení žádný požadavek na připomínky
 * a #prip-fab není v DOM. Pojistka: před opravou 2 požadavky (nastavení
 * a seznam správce) a skryté tlačítko v DOM. */
test('NN #712: při VYP po přihlášení žádný požadavek na /api/pripominky', pozadavkuPrip === 0, pozadavkuPrip);
test('NN #712: při VYP plovoucí tlačítko #prip-fab v DOM není', await page.evaluate(() => !document.getElementById('prip-fab')));
const zalozen = await page.evaluate(() => onlineApi('/api/uzivatele', { akce: 'zaloz', email: 'obchodnik.pr@priklad.cz',
  jmeno: 'Petr Zkušební', role: 'Obchodník', heslo: 'ZkusebniHeslo1' }).then(o => o.ok));
test('založení obchodníka', zalozen);
await page.evaluate(() => { otevriNastaveni(); nastPanel('pripominky'); });
await page.waitForTimeout(500);
const tabs = await page.evaluate(() => [...document.querySelectorAll('#nastaveni-panel .nast-tabs button')].map(b => b.textContent.trim()));
const iU = tabs.indexOf('Uživatelé');
test('záložka „💬 Připomínky (0)" stojí hned za Uživateli', iU >= 0 && tabs[iU + 1] === '💬 Připomínky (0)', tabs);
await page.check('#prip-n-zapnuto');
await page.click('text=Uložit nastavení připomínek');
await page.waitForTimeout(600);
test('správce zapnul funkci (hláška)', /Nastavení připomínek uloženo/.test(await page.locator('#nastaveni-panel').innerText()));
await odhlas();

/* --- obchodník odešle připomínku s místem --- */
await prihlas('obchodnik.pr@priklad.cz', 'ZkusebniHeslo1');
test('obchodník: plovoucí tlačítko „Připomínka" je vidět', await viditelny('#prip-fab')
  && /Připomínka/.test(await page.locator('#prip-fab').innerText()));
const barva = await page.evaluate(() => getComputedStyle(document.getElementById('prip-fab')).backgroundColor);
test('tlačítko je tmavě modré #0B2E6B', barva === 'rgb(11, 46, 107)', barva);
await page.click('#prip-fab');
await page.waitForTimeout(300);
const sirka = await page.evaluate(() => document.getElementById('prip-panel').getBoundingClientRect().width);
test('panel zprava, šířka 430 px', await viditelny('#prip-panel') && Math.round(sirka) === 430, sirka);
test('záložky Nová připomínka / Moje připomínky', /Nová připomínka/.test(await page.locator('#prip-panel .nast-tabs').innerText())
  && /Moje připomínky/.test(await page.locator('#prip-panel .nast-tabs').innerText()));
test('4 typy v mřížce 2×2', (await page.locator('.prip-typ').count()) === 4
  && await page.evaluate(() => getComputedStyle(document.querySelector('.prip-typy')).gridTemplateColumns.split(' ').length === 2));
test('Odeslat neaktivní bez typu a textu', await page.isDisabled('#prip-odeslat'));
await page.fill('#prip-text', 'Po kliknutí na záložku Kalkulace PROJ se nic nestalo, musel jsem obnovit stránku.');
test('Odeslat neaktivní jen s textem (bez typu)', await page.isDisabled('#prip-odeslat'));
await page.click('.prip-typ[data-typ="cena"]');
const ph1 = await page.getAttribute('#prip-text', 'placeholder');
await page.click('.prip-typ[data-typ="chyba"]');
const ph2 = await page.getAttribute('#prip-text', 'placeholder');
test('placeholder se mění podle typu', ph1 !== ph2 && /nesedí/.test(ph1) && /Co jste dělali/.test(ph2), [ph1, ph2]);
test('text přežil překreslení panelu', (await page.inputValue('#prip-text')).startsWith('Po kliknutí'));
test('Odeslat aktivní s typem a textem', !(await page.isDisabled('#prip-odeslat')));
await page.waitForFunction(() => !PRIP.nahledBezi, null, { timeout: 6000 });
const nahled = await page.evaluate(() => PRIP.nahled.slice(0, 30));
test('miniatura snímku: JPEG (SVG foreignObject → canvas)', /^data:image\/jpeg;base64,/.test(nahled)
  && (await page.locator('img.prip-miniatura').count()) === 1, nahled);
test('blok „Přiložíme automaticky" s obrazovkou a verzí', /Přiložíme automaticky/.test(await page.locator('#prip-panel').innerText())
  && /Obrazovka: Kalkulace OCK/.test(await page.locator('.prip-auto').innerText()) && /Verze aplikace: v\d/.test(await page.locator('.prip-auto').innerText()));
test('zaškrtávátko „Přiložit snímek obrazovky" výchozí zapnuto', await page.isChecked('#prip-snimek-chk'));
if (SNIMKY) { mkdirSync(CIL, { recursive: true }); await page.screenshot({ path: CIL + '01_obchodnik_nova.png' }); }

/* výběr místa */
await page.click('#prip-misto');
await page.waitForTimeout(200);
test('výběr místa: panel schovaný, lišta nahoře', !(await viditelny('#prip-panel')) && await viditelny('#prip-vyber-lista')
  && /Klikněte na místo, kterého se připomínka týká/.test(await page.locator('#prip-vyber-lista').innerText()));
const cil = page.locator('#tab-proj');
await cil.hover();
await page.waitForTimeout(150);
const ram = await page.evaluate(() => { const r = document.getElementById('prip-vyber-ram'); const s = getComputedStyle(r);
  return { vid: s.display !== 'none', styl: s.borderTopStyle, barva: s.borderTopColor }; });
test('rámeček pod myší přerušovaně oranžově', ram.vid && ram.styl === 'dashed' && ram.barva === 'rgb(249, 115, 22)', ram);
if (SNIMKY) await page.screenshot({ path: CIL + '02_vyber_mista.png', clip: { x: 0, y: 0, width: 1366, height: 260 } });
await cil.click();
await page.waitForTimeout(300);
test('klik prvek neaktivoval (záložka zůstala Kalkulace OCK)', await page.evaluate(() => TAB) === 'kalk');
test('panel je zpět a lišta pryč', await viditelny('#prip-panel') && !(await viditelny('#prip-vyber-lista')));
const cip = await page.locator('.prip-cip').innerText().catch(() => '');
test('čip „📍 … › Kalkulace PROJ" s křížkem', /📍/.test(cip) && /›\s*Kalkulace PROJ/.test(cip) && (await page.locator('.prip-cip button').count()) === 1, cip);
await page.waitForFunction(() => !PRIP.nahledBezi, null, { timeout: 6000 });
if (SNIMKY) await page.screenshot({ path: CIL + '03_obchodnik_misto.png' });
/* XSS: druhou připomínku pošleme přes API (text s HTML) — UI ji musí escapovat */
/* N6 revize: snímek se při odeslání pořizuje znovu (ne ten z otevření panelu). */
await page.evaluate(() => { window.__snimku = 0; const p = window.pripSnimekPoriz;
  window.pripSnimekPoriz = function () { window.__snimku++; return p.apply(this, arguments); }; });
await page.click('#prip-odeslat');
await page.waitForSelector('.prip-dekujeme', { timeout: 8000 });
test('N6: při odeslání se pořídil čerstvý snímek', await page.evaluate(() => window.__snimku) >= 1);
const dek = await page.locator('#prip-panel').innerText();
test('po odeslání: fajfka, „Děkujeme…", P-0001, Co bude dál ve 3 krocích', /Děkujeme, připomínka je odeslaná/.test(dek) && /P-0001/.test(dek)
  && /Co bude dál/i.test(dek) && (await page.locator('.prip-dal li').count()) === 3 && (await page.locator('.prip-fajfka').count()) === 1, dek.slice(0, 200));
if (SNIMKY) await page.screenshot({ path: CIL + '04_obchodnik_odeslano.png' });
const ulozena = JSON.parse(pamet.get('pripominky/p/P-0001') || 'null');
test('N1: popisek z textu tlačítka má původ „obsah“ (ke koordinaci nejde)', ulozena && ulozena.kontext.misto && ulozena.kontext.misto.zdroj === 'obsah',
  ulozena && ulozena.kontext.misto);
test('server: místo, obrazovka, verze a snímek uložené', ulozena && ulozena.kontext.misto && /Kalkulace PROJ/.test(ulozena.kontext.misto.popisek)
  && ulozena.kontext.obrazovka === 'Kalkulace OCK' && ulozena.snimek === true && pamet.has('pripominky_snimky/P-0001'), ulozena && ulozena.kontext);
const xss = await page.evaluate(() => onlineApi('/api/pripominky', { typ: 'dotaz', text: '<img src=x onerror="window.__xss=1"> Jak přidám šachtu?', kontext: {} }).then(d => d.id));
test('druhá připomínka (s HTML v textu) odeslaná', xss === 'P-0002', xss);
await odhlas();

/* --- správce vyřídí --- */
await prihlas(process.env.ADMIN_EMAIL, 'Zkusebni.Heslo.123');
await page.waitForTimeout(300);
const listaBtn = await page.locator('#prip-lista-btn').innerText().catch(() => '');
test('horní lišta: „💬 Připomínky 2" jen pro správce', /💬 Připomínky\s*2/.test(listaBtn), listaBtn);
await page.click('#prip-lista-btn');
await page.waitForTimeout(700);
test('záložka „💬 Připomínky (2)"', (await page.locator('#nastaveni-panel .nast-tabs button.act').innerText()).trim() === '💬 Připomínky (2)');
const cipy = await page.locator('.prip-filtry').first().innerText();
test('filtry jako čipy s počty', /Nové 2/.test(cipy) && /Ve frontě oprav 0/.test(cipy) && /Odložené \/ zamítnuté 0/.test(cipy) && /Vše 2/.test(cipy), cipy);
test('nepřečtené řádky zvýrazněné', (await page.locator('tr.prip-neprectena').count()) === 2);
test('XSS: text se u správce nespustil', await page.evaluate(() => window.__xss === undefined)
  && (await page.locator('#prip-sp-telo').innerText()).includes('<img src=x'));
await page.click('tr[data-id="P-0001"]');
await page.waitForFunction(() => PRIP.sp.snimky['P-0001'], null, { timeout: 5000 });
await page.waitForTimeout(300);
const det = await page.locator('.prip-sp-detail').innerText();
test('detail: text, obrazovka, místo, verze, otevřít zakázku chybí bez souboru', /Po kliknutí na záložku/.test(det) && /Kalkulace OCK/.test(det)
  && /📍 .*Kalkulace PROJ/.test(det) && /Verze a prohlížeč/.test(det), det.slice(0, 500));
test('detail: snímek s vyznačeným místem', (await page.locator('.prip-snimek img').count()) === 1 && (await page.locator('.prip-snimek-ram').count()) === 1);
/* NN PR-T2: detail nepřetéká panel a plovoucí tlačítko při otevřeném Nastavení nezakrývá snímek.
 * Pojistka: před opravou bylo #prip-fab nad oknem Nastavení vidět (správce smí odesílat). */
{
  const roz = await page.evaluate(() => { const d = document.querySelector('.prip-sp-detail'); const k = document.querySelector('.prip-kontext');
    const f = document.getElementById('prip-fab');
    return { det: d.getBoundingClientRect().right, kont: k.scrollWidth - k.clientWidth, panel: document.getElementById('nastaveni-panel').getBoundingClientRect().right,
      fab: !!f && getComputedStyle(f).display !== 'none' }; });
  test('NN PR-T2: tabulka Kontext nepřetéká a detail se vejde do okna', roz.kont <= 1 && roz.det <= roz.panel + 1, roz);
  test('NN PR-T2: plovoucí tlačítko je při otevřeném Nastavení skryté', !roz.fab, roz);
}
test('detail: akce Do fronty / Odpovědět a uzavřít / Odložit / Zamítnout / Duplicitní s…',
  ['➜ Do fronty oprav', 'Odpovědět a uzavřít', 'Odložit', 'Zamítnout', 'Duplicitní s…'].every(t => det.includes(t)));
test('po otevření je řádek přečtený (zbývá 1)', (await page.locator('tr.prip-neprectena').count()) === 1);
if (SNIMKY) await page.screenshot({ path: CIL + '05_spravce_detail.png' });
await page.click('.prip-akce >> text=Odložit');
await page.waitForTimeout(300);
test('odložit bez zdůvodnění: hláška, stav se nezměnil', /zdůvodnění/.test(await page.locator('#nastaveni-panel').innerText())
  && JSON.parse(pamet.get('pripominky/p/P-0001')).stav === 'nova');
await page.fill('#prip-sp-odpoved', 'Děkujeme, opraveno ve verzi 21.11.2 — záložka se přepíná hned.');
await page.click('.prip-akce >> text=Odpovědět a uzavřít');
await page.waitForTimeout(600);
test('Odpovědět a uzavřít: stav Hotovo, z filtru Nové zmizela', JSON.parse(pamet.get('pripominky/p/P-0001')).stav === 'hotovo'
  && (await page.locator('tr[data-id="P-0001"]').count()) === 0);
await page.click('.prip-cip-filtr[data-filtr="vse"]');
await page.waitForTimeout(300);
test('filtr Vše: P-0001 se stavem Hotovo', /Hotovo/.test(await page.locator('tr[data-id="P-0001"]').innerText()));
await page.click('tr[data-id="P-0002"]');
await page.waitForTimeout(300);
await page.fill('#prip-sp-odpoved', 'Postup je v manuálu, kapitola Víc šachet.');
await page.click('.prip-akce >> text=Zamítnout');
await page.waitForTimeout(600);
test('zamítnout se zdůvodněním projde', JSON.parse(pamet.get('pripominky/p/P-0002')).stav === 'zamitnuto');
test('Nastavení připomínek: role, snímek, e-mail, zdroj, interval, limit, uchovávání, klíč',
  await page.evaluate(() => ['Kdo vidí tlačítko', 'Snímek obrazovky přiložit', 'E-mail správci', 'Zdroj pro frontu oprav', 'Interval čtení koordinací',
    'Limit za den', 'Uchovávat vyřízené', 'Klíč pro koordinaci'].every(t => document.getElementById('nastaveni-panel').textContent.includes(t))));
/* N2 revize: nový klíč se ukáže jen na záložce; po opuštění záložky zmizí. */
await page.evaluate(() => { window.onlineHesloSpravce = async () => 'Zkusebni.Heslo.123'; });
await page.click('text=Vydat klíč');
await page.waitForSelector('#prip-novy-klic', { timeout: 5000 }).catch(() => {});
const klicText = await page.locator('#prip-novy-klic').innerText().catch(() => '');
test('správce: klíč vydán a ukázán jednou', /^kngpr_/.test(klicText), klicText.slice(0, 10));
await page.evaluate(() => nastPanel('firma')); await page.waitForTimeout(200);
await page.evaluate(() => nastPanel('pripominky')); await page.waitForTimeout(300);
test('N2: po opuštění záložky se klíč už neukáže', (await page.locator('#prip-novy-klic').count()) === 0
  && await page.evaluate(() => PRIP.sp.novyKlic) === '');
if (SNIMKY) await page.locator('.prip-nast').screenshot({ path: CIL + '06_spravce_nastaveni.png' });
await odhlas();

/* --- autor vidí odpověď --- */
await prihlas('obchodnik.pr@priklad.cz', 'ZkusebniHeslo1');
await page.waitForTimeout(400);
const fab = await page.locator('#prip-fab').innerText();
test('tlačítko ukazuje 2 nové odpovědi (červené číslo)', /2/.test(await page.locator('.prip-fab-pocet').innerText().catch(() => '')), fab);
await page.click('#prip-fab');
await page.waitForTimeout(500);
test('otevře se rovnou „Moje připomínky"', /Moje připomínky/.test(await page.locator('#prip-panel .nast-tabs button.act').innerText()));
const k1 = page.locator('.prip-karta[data-id="P-0001"]');
test('karta P-0001: zvýrazněná, Hotovo, průběh 4 kroky, odpověď', (await k1.getAttribute('class')).includes('prip-nova')
  && /Hotovo/.test(await k1.innerText()) && (await k1.locator('.prip-krok').count()) === 4 && (await k1.locator('.prip-krok.hotovy').count()) === 4
  && /opraveno ve verzi 21\.11\.2/.test(await k1.innerText()));
const k2 = page.locator('.prip-karta[data-id="P-0002"]');
test('zamítnutá: odpověď oranžově, kroky neodškrtnuté', (await k2.locator('.prip-odpoved.oranzova').count()) === 1
  && (await k2.locator('.prip-krok.hotovy').count()) === 0);
test('XSS: text se u autora nespustil', await page.evaluate(() => window.__xss === undefined));
if (SNIMKY) await page.screenshot({ path: CIL + '07_autor_odpoved.png' });
await page.waitForTimeout(400);
test('po otevření přečteno: číslo na tlačítku zmizí, server bez novinek', await page.evaluate(() => PRIP.novych) === 0
  && !JSON.parse(pamet.get('pripominky/p/P-0001')).odpovedNova);
await page.evaluate(() => render());
await page.waitForTimeout(200);
test('překreslení aplikace panel nezavře ani nesmaže', await viditelny('#prip-panel'));

/* N2 revize: rozepsaný text, náhled snímku ani stav správce nepřežijí odhlášení. */
await page.evaluate(() => pripZalozka('nova'));
await page.waitForTimeout(300);
await page.click('.prip-typ[data-typ="navrh"]');
await page.fill('#prip-text', 'Rozepsaný návrh, který se nesmí ukázat dalšímu uživateli.');
await page.waitForFunction(() => !PRIP.nahledBezi, null, { timeout: 6000 });
test('N2 příprava: rozepsaný text a náhled snímku v paměti', await page.evaluate(() => PRIP.text.length > 10 && PRIP.nahled.length > 100));
await odhlas();
const poOdhl = await page.evaluate(() => ({ text: PRIP.text, nahled: PRIP.nahled, panel: PRIP.panel, typ: PRIP.typ,
  vid: (document.getElementById('prip-panel') || {}).innerHTML || '' }));
test('N2: po odhlášení je stav připomínek prázdný (text, typ, náhled, panel)', poOdhl.text === '' && poOdhl.typ === '' && poOdhl.nahled === ''
  && !poOdhl.panel && !/Rozepsaný návrh/.test(poOdhl.vid), poOdhl);
await prihlas(process.env.ADMIN_EMAIL, 'Zkusebni.Heslo.123');
await page.waitForTimeout(300);
await page.evaluate(() => pripPanelOtevri('nova'));
await page.waitForTimeout(300);
test('N2: další uživatel v témže okně nevidí cizí rozepsaný text', (await page.inputValue('#prip-text')) === '');
await page.evaluate(() => pripPanelZavri());
test('N6: zavření panelu zahodí náhled snímku', await page.evaluate(() => PRIP.nahled) === '');

/* NN PR-T1 (soukromí, B257): po odhlášení správce nesmí ve skrytém okně Nastavení zůstat záložka Připomínky
 * (e-maily autorů, plný snímek). Pojistka: před opravou obchodník přihlášený v témže okně našel v DOM
 * data:image i e-mail jiného autora (druhy.pr…). */
await page.evaluate(() => { otevriNastaveni(); nastPanel('pripominky'); });
await page.waitForTimeout(400);
await page.waitForFunction(() => PRIP.sp.nacteno && PRIP.sp.seznam.some(p => p.id === 'P-0001'), null, { timeout: 5000 }).catch(() => {});
await page.evaluate(() => pripSpVyber('P-0001'));
await page.waitForFunction(() => PRIP.sp.snimky['P-0001'], null, { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const snimekOtisk = await page.evaluate(() => String(PRIP.sp.snimky['P-0001'] || '').slice(-80)) || 'chybi-snimek-nesmi-byt-prazdny';
test('NN PR-T1 příprava: správce má v DOM detail se snímkem', snimekOtisk.length > 40 && await page.evaluate((o) => document.body.innerHTML.includes(o), snimekOtisk));
await page.evaluate(() => { document.getElementById('nastaveni-overlay').style.display = 'none'; });
await odhlas();
const poOdhlSpr = await page.evaluate((o) => ({ img: document.body.innerHTML.includes(o), kde: [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && (e.outerHTML || '').includes(o)).map(e => e.tagName + '#' + e.id + '.' + e.className).slice(0, 3),
  panel: (document.getElementById('nastaveni-panel') || {}).innerHTML || '' }), snimekOtisk);
test('NN PR-T1: po odhlášení správce okno Nastavení prázdné a v DOM žádný snímek', !poOdhlSpr.img && poOdhlSpr.panel === '', { kde: poOdhlSpr.kde, panel: poOdhlSpr.panel.slice(0, 200) });
await prihlas('obchodnik.pr@priklad.cz', 'ZkusebniHeslo1');
const uObch = await page.evaluate((o) => ({ img: document.body.innerHTML.includes(o),
  detail: !!document.querySelector('.prip-sp-detail'), cizi: /spravce@priklad|prip-sp-telo/.test((document.getElementById('nastaveni-panel') || {}).innerHTML || '') }), snimekOtisk);
test('NN PR-T1: obchodník v témže okně nenajde v DOM snímek ani detail správce', !uObch.img && !uObch.detail && !uObch.cizi, uObch);
await odhlas();

test('za celý průchod nevznikla nečekaná chyba v konzoli', chyby.length === 0, chyby);
await prohlizec.close();
server.close();
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
