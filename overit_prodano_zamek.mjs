/* PB #547 — PRODÁNO NAD ODESLANOU NABÍDKOU v prohlížeči, celý tok.
 *
 * Chyba nalezená J. V. 2. 11. 2026 na testu (v27.10.6): online otevřená
 * zakázka s vytištěnou CN (zamčená varianta, okno jen ke čtení) → krycí list
 * OCK → karta Prodej → Prodáno → Ano → vyskočil dialog „Uzamčená varianta …
 * Chcete pokračovat v klonu varianty?" a po „Nechat beze změny" hláška
 * „Prodej se neuložil: Otevřeno online: ….json". Harness overit_controlling
 * to nechytil — prodej zapisoval přímo modelem (prodNastav) mimo uložení.
 *
 * Tady jde SKUTEČNÝ klient proti SKUTEČNÝM serverovým funkcím (most jako
 * v overit_online.mjs, paměťové úložiště): obchodník zakázku uloží, vytiskne
 * (zamekPoTisku), otevře z databáze (jen ke čtení) a klikne na Prodáno.
 * Ověřuje se: žádný dialog klonu, prodej uložen, po znovuotevření prodáno
 * a krycí list zmrazený, varianta jedna (žádný klon), zámek čtení zůstává;
 * cizí obchodník dostane skutečný důvod odmítnutí (ne „Otevřeno online");
 * okno s jinou neuloženou změnou prodej neuloží a řekne proč; vedoucí prodej
 * odemkne (taky bez dialogu klonu) a odemčení se uloží; texty karty
 * a potvrzení mluví o fázi „Vyhrané k podpisu SoD", ne o „Vyhráno".
 *
 * Pojistka: nad 141b92f (v2.11.2) selže „žádný dialog klonu", „prodej
 * uložen" i „skutečný důvod" (viz commit). Smyšlené účty a údaje.
 * Spuštění: NODE_PATH=$(npm root -g) node overit_prodano_zamek.mjs */
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-harness';
process.env.ADMIN_INIT_HESLO = 'Zkusebni.Heslo.123';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'spravce@priklad.cz';
const pamet = new Map();
globalThis.__TEST_ULOZISTE = (nazev) => ({
  async cti(k) { return pamet.has(nazev + '/' + k) ? JSON.parse(pamet.get(nazev + '/' + k)) : null; },
  async zapis(k, v) { pamet.set(nazev + '/' + k, JSON.stringify(v)); },
  async seznam(prefix) { return [...pamet.keys()].filter(x => x.startsWith(nazev + '/' + (prefix || ''))).map(x => x.slice(nazev.length + 1)); },
  async smaz(k) { pamet.delete(nazev + '/' + k); },
});

const { createRequire } = await import('module');
const { createServer } = await import('http');
const { readFileSync } = await import('fs');
const { default: path } = await import('path');
const { default: zdravi } = await import('./netlify/functions/zdravi.mjs');
const { default: ja } = await import('./netlify/functions/ja.mjs');
const { default: prihlaseni } = await import('./netlify/functions/prihlaseni.mjs');
const { default: odhlaseni } = await import('./netlify/functions/odhlaseni.mjs');
const { default: uzivatele } = await import('./netlify/functions/uzivatele.mjs');
const { default: program } = await import('./netlify/functions/program.mjs');
const { default: zakazky } = await import('./netlify/functions/zakazky.mjs');
const { default: firma } = await import('./netlify/functions/firma.mjs');
const { default: zobrazeni } = await import('./netlify/functions/zobrazeni.mjs');
const { default: popisyFn } = await import('./netlify/functions/popisy.mjs');
const { default: zakazniciFn } = await import('./netlify/functions/zakaznici.mjs');
const { default: sablonyFn } = await import('./netlify/functions/sablony.mjs');
const { default: analytikaFn } = await import('./netlify/functions/analytika.mjs');
const { default: slovnikFn } = await import('./netlify/functions/slovnik.mjs');
const { default: controllingFn } = await import('./netlify/functions/controlling.mjs');
const { default: pdStavFn } = await import('./netlify/functions/pd_stav.mjs');

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_prodano_zamek.mjs'); process.exit(2); }

const FUNKCE = { '/api/zdravi': zdravi, '/api/ja': ja, '/api/prihlaseni': prihlaseni, '/api/odhlaseni': odhlaseni,
  '/api/uzivatele': uzivatele, '/api/program': program, '/api/zakazky': zakazky, '/api/firma': firma,
  '/api/zobrazeni': zobrazeni, '/api/popisy': popisyFn, '/api/zakaznici': zakazniciFn, '/api/sablony': sablonyFn,
  '/api/analytika': analytikaFn, '/api/slovnik': slovnikFn, '/api/controlling': controllingFn, '/api/pd/stav': pdStavFn };

let ok = 0, fail = 0;
const test = (n, cond, info) => {
  if (cond) { ok++; console.log('OK  ' + n); }
  else { fail++; console.log('FAIL ' + n, info === undefined ? '' : JSON.stringify(info).slice(0, 600)); }
};
const post = (fn, url, telo, cookie) => fn(new Request(url, { method: 'POST', headers: cookie ? { cookie } : {}, body: JSON.stringify(telo) }));

/* Příprava serveru: zkušební ceník zveřejněný administrátorem (B112), účty. */
const ZKC = require('./src/zkusebni_cenik.js');
const ceniky = { ock: ZKC.zkusebniCenik(), proj: ZKC.zkusebniCenikProj() };
{
  const rA = await post(prihlaseni, 'http://x/api/prihlaseni', { email: process.env.ADMIN_EMAIL, heslo: 'Zkusebni.Heslo.123' });
  const cA = (rA.headers.get('set-cookie') || '').split(';')[0];
  const rp = await (await post(program, 'http://x/api/program', { cenik: ceniky.ock, cenikProj: ceniky.proj, poznamka: 'PB #547 (harness)' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [email, role] of [['obch.prodej@priklad.cz', 'Obchodník'], ['cizi.prodej@priklad.cz', 'Obchodník'], ['ved.prodej@priklad.cz', 'Vedoucí']]) {
    const x = await (await post(uzivatele, 'http://x/api/uzivatele', { akce: 'zaloz', email, jmeno: 'Test ' + role, role, heslo: 'Heslo12345x' }, cA)).json();
    if (!x.ok) throw new Error('uzivatel ' + JSON.stringify(x));
  }
}

const html = readFileSync(path.resolve('dist/kalkulacka.html'));
const server = createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await prohlizec.newContext()).newPage();
const { hlidejHarness } = require('./nastroje/harness_hlidac.js');
hlidejHarness({ page, uklid: async () => { await prohlizec.close(); server.close(); } });
const chyby = [];
page.on('console', m => { if (m.type() === 'error' && !/status of (401|403|400|409)/.test(m.text())) chyby.push('console: ' + m.text()); });
page.on('pageerror', e => chyby.push('pageerror: ' + e.message));

let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request();
  const fn = FUNKCE[new URL(r.url()).pathname];
  if (!fn) return route.fulfill({ status: 404, body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar } };
  if (r.method() === 'POST') init.body = r.postData() || '';
  const odp = await fn(new Request(r.url(), init));
  const setc = odp.headers.get('set-cookie');
  if (setc) cookieJar = setc.split(';')[0];
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: await odp.text() });
});

await page.goto(ADRESA);
await page.waitForFunction(() => typeof window.render === 'function');
await page.waitForTimeout(400);

/* Dialogy: harness si zapamatuje každý text i nadpis. Potvrzení „Prodáno"
 * odklepne Ano; dialog „Uzamčená varianta" (klon) odmítne „Nechat beze
 * změny" — přesně jako J. V. — a zaznamená ho jako chybu toku. */
await page.evaluate(() => {
  window.__dlg = [];
  window.potvrd = (t, o) => { const nadpis = (o && o.nadpis) || ''; window.__dlg.push({ druh: 'potvrd', nadpis, text: String(t) });
    return Promise.resolve(nadpis === 'Prodáno'); };
  window.hlaska = (t) => { window.__dlg.push({ druh: 'hlaska', text: String(t) }); return Promise.resolve(); };
  /* Přepnutí zakázky s „neuloženými změnami" (po odhlášení / odmítnutém prodeji): zahodit. */
  window.volba = (t) => { window.__dlg.push({ druh: 'volba', text: String(t) }); return Promise.resolve('zahodit'); };
  window.dotaz = (t, v) => { window.__dlg.push({ druh: 'dotaz', text: String(t) }); return Promise.resolve('Zákazník odstoupil od objednávky'); };
});
const dlg = () => page.evaluate(() => window.__dlg.splice(0));
const klon = (d) => d.some(x => /klonu varianty|Uzamčená varianta/.test(x.text + ' ' + (x.nadpis || '')));
const prihlas = (email) => page.evaluate(async (email) => {
  if (ONLINE_STAV.ja) await onlineOdhlas();
  ONLINE_STAV.formEmail = email; ONLINE_STAV.formHeslo = email === 'spravce@priklad.cz' ? 'Zkusebni.Heslo.123' : 'Heslo12345x';
  await onlinePrihlas();
  return ONLINE_STAV.ja && ONLINE_STAV.ja.email;
}, email);
const otevri = (soubor) => page.evaluate(async (s) => { await onlineOtevri(s); prepniTab('kryci'); render();
  return { cteni: zamekCteniJe(), zamceno: variantaUzamcena(aktivniVarianta(ZAK)) }; }, soubor);
/* Klik na tlačítko v kartě Prodej (OCK), jak to dělá obchodník. */
const klikni = async (text) => {
  const tl = page.locator('#prodejKarta_ock button', { hasText: text }).first();
  await tl.click();
  await page.waitForFunction(() => !ONLINE_STAV.ukladaBeh && !ZAKULO_STAV.uklada, null, { timeout: 15000 });
  await page.waitForTimeout(300);
};
const naServeru = async (soubor) => {
  const rA = await post(prihlaseni, 'http://x/api/prihlaseni', { email: process.env.ADMIN_EMAIL, heslo: 'Zkusebni.Heslo.123' });
  const cA = (rA.headers.get('set-cookie') || '').split(';')[0];
  return (await (await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), { headers: { cookie: cA } }))).json()).zakazka;
};

/* ---- 1) obchodník: odeslaná nabídka, otevřená z databáze jen ke čtení ---- */
test('obchodník přihlášen', await prihlas('obch.prodej@priklad.cz') === 'obch.prodej@priklad.cz');
const soubor = await page.evaluate(async (ceniky) => {
  zakOdpojUlozeni();
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 8721'; ZAK.nazevAkce = 'TEST Prodáno PB';
  const v = aktivniVarianta(ZAK);
  v.data.cenik = ceniky.ock; v.data.proj.cenik = ceniky.proj;
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  syncVarianta(); render();
  await onlineUloz();
  zamekPoTisku('nabidkaTisk', aktivniVarianta(ZAK).id);
  await (ONLINE_STAV.ukladaBeh || Promise.resolve());
  return ONLINE_STAV.soubor;
}, ceniky);
test('příprava: nabídka uložená a vytištěná (zámek na serveru)', !!soubor
  && !!((await naServeru(soubor)).varianty[0].zamek || {}).zamceno, soubor);
let o = await otevri(soubor);
test('otevřená z databáze: jen ke čtení, varianta zamčená (stav z hlášení J. V.)', o.cteni && o.zamceno, o);
await dlg();

/* ---- 2) texty karty a potvrzení (#545) ---- */
const karta = await page.evaluate(() => (document.getElementById('prodejKarta_ock') || {}).textContent || '');
test('karta Prodej: fáze „Vyhrané k podpisu SoD", žádné „deal → Vyhráno"',
  /fáze\s+Vyhrané k podpisu SoD/.test(karta) && !/Vyhráno/.test(karta), karta.slice(0, 400));
test('tlačítko Prodáno je u odeslané nabídky povolené',
  await page.locator('#prodejKarta_ock button', { hasText: 'Prodáno' }).first().isEnabled());

/* ---- 3) Prodáno → Ano → žádný klon → uloženo ---- */
await klikni('Prodáno');
let d = await dlg();
const potvrzeni = d.find(x => x.nadpis === 'Prodáno');
test('potvrzení „Označit variantu … jako PRODANOU" se ukázalo', !!potvrzeni && /jako PRODANOU/.test(potvrzeni.text), d);
test('potvrzení mluví o fázi Vyhrané k podpisu SoD, ne o „Vyhráno"',
  !!potvrzeni && /fáze Vyhrané k podpisu SoD/.test(potvrzeni.text) && !/Vyhráno/.test(potvrzeni.text), potvrzeni && potvrzeni.text);
test('PB #547: ŽÁDNÝ dialog „Uzamčená varianta … klon"', !klon(d), d);
test('PB #547: žádná hláška „Prodej se neuložil"', !d.some(x => /Prodej se neuložil/.test(x.text)), d);
let srv = await naServeru(soubor);
test('PB #547: prodej je uložený na serveru (datum, stav Pipedrive „čeká")', !!(srv.varianty[0].prodano
  && srv.varianty[0].prodano.datum && srv.varianty[0].prodano.pipedrive.stav === 'ceka'), srv.varianty[0].prodano);
test('…zapsal ho obchodník (razítko serveru) a stopa je v historii',
  srv.varianty[0].prodano && srv.varianty[0].prodano.kdo === 'obch.prodej@priklad.cz'
    && (srv.prodejHistorie || []).some(h => h.akce === 'prodano'), srv.prodejHistorie);
test('…žádný klon: v zakázce zůstala jediná varianta, zamčená', srv.varianty.length === 1 && !!srv.varianty[0].zamek.zamceno, srv.varianty.length);
test('…okno zůstalo jen ke čtení (prodej zámek čtení neodemyká)', await page.evaluate(() => zamekCteniJe()));

/* ---- 4) znovuotevření ---- */
o = await otevri(soubor);
const po = await page.evaluate(() => {
  const v = aktivniVarianta(ZAK);
  return { prodano: !!prodStav(ZAK), volne: zamekKryciPoleStav(v, 'kryci', 'jmenoPrijmeni'), sod: zamekKryciPoleStav(v, 'kryci', 'cisloSod'),
    text: (document.getElementById('prodejKarta_ock') || {}).textContent || '',
    nazev: typeof zamekZakCestaZmrazena === 'function' ? !!zamekZakCestaZmrazena(ZAK, 'ZAK.objednatel') : null };
});
test('po znovuotevření je varianta prodaná a karta to ukazuje', po.prodano && /✔ Prodáno/.test(po.text), po.text.slice(0, 200));
test('…krycí list zamčený i ve volném poli (kontakt zákazníka, definitivně)', po.volne === 'zmrazeno', po.volne);
test('…kromě čísla SoD, které jde doplnit do prvního tisku SoD (K37-N2)', po.sod === 'editovatelne', po.sod);
test('…hlavička (zákazník) zmrazená', po.nazev === true, po.nazev);
test('…obchodník prodej neodemkne (tlačítko jen pro vedoucího)', !/Odemknout prodej(?! smí)/.test(po.text), po.text.slice(0, 300));

/* ---- 5) cizí obchodník: skutečný důvod, ne „Otevřeno online" ---- */
const soubor2 = await page.evaluate(async (ceniky) => {
  zakOdpojUlozeni();   // nová zakázka (shodí i zámek čtení po předchozí)
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 8722'; ZAK.nazevAkce = 'TEST Prodáno cizí';
  const v = aktivniVarianta(ZAK);
  v.data.cenik = ceniky.ock; v.data.proj.cenik = ceniky.proj;
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2 });
  syncVarianta(); render();
  await onlineUloz();
  zamekPoTisku('nabidkaTisk', aktivniVarianta(ZAK).id);
  await (ONLINE_STAV.ukladaBeh || Promise.resolve());
  return ONLINE_STAV.soubor;
}, ceniky);
await prihlas('cizi.prodej@priklad.cz');
await otevri(soubor2); await dlg();
await klikni('Prodáno');
d = await dlg();
const odm = d.find(x => /Prodej se neuložil/.test(x.text));
test('cizí obchodník: bez dialogu klonu', !klon(d), d);
test('cizí obchodník: hláška nese skutečný důvod serveru, ne „Otevřeno online"', !!odm
  && /obchodník zakázky, vedoucí nebo administrátor/.test(odm.text) && !/Otevřeno online/.test(odm.text) && /zůstává neprodaná/.test(odm.text), d);
test('…a zakázka zůstala neprodaná (okno i server)', await page.evaluate(() => !prodStav(ZAK)) && !(await naServeru(soubor2)).varianty[0].prodano);

/* ---- 6) okno jen ke čtení s jinou neuloženou změnou ---- */
await prihlas('obch.prodej@priklad.cz');
await otevri(soubor2); await dlg();
await page.evaluate(() => { aktivniVarianta(ZAK).data.ock.zadani.zdvih = 12; });   // změna mimo set() (jako ji udělá aplikace)
await klikni('Prodáno');
d = await dlg();
const jine = d.find(x => /Prodej se neuložil/.test(x.text));
test('jiná neuložená změna: prodej se neuloží, bez dialogu klonu', !klon(d) && !!jine, d);
test('…a hláška říká proč (jen ke čtení + jiné změny), ne „Otevřeno online"', !!jine && /jen ke čtení/.test(jine.text)
  && /jiné neuložené změny/.test(jine.text) && !/Otevřeno online/.test(jine.text), jine && jine.text);
test('…server beze změny', !(await naServeru(soubor2)).varianty[0].prodano && (await naServeru(soubor2)).varianty[0].data.ock.zadani.zdvih === 9);

/* ---- 7) neodeslaná nabídka: Prodáno nejde ---- */
const neodes = await page.evaluate(() => {
  zakOdpojUlozeni(); ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - 8723'; syncVarianta(); prepniTab('kryci'); render();
  const t = [...document.querySelectorAll('#prodejKarta_ock button')].find(b => b.textContent.trim() === 'Prodáno');
  return { disabled: !!t && t.disabled, text: (document.getElementById('prodejKarta_ock') || {}).textContent || '' };
});
test('neodeslaná nabídka: Prodáno zhasnuté s důvodem', neodes.disabled && /jen odeslanou \(zamčenou\) nabídku/.test(neodes.text), neodes);

/* ---- 8) vedoucí: odemknutí prodeje, bez dialogu klonu ---- */
await prihlas('ved.prodej@priklad.cz');
o = await otevri(soubor); await dlg();
test('vedoucí: zakázka otevřená jen ke čtení, prodaná', o.cteni && await page.evaluate(() => !!prodStav(ZAK)), o);
await klikni('Odemknout prodej');
d = await dlg();
test('vedoucí: odemknutí bez dialogu klonu a bez chybové hlášky', !klon(d) && !d.some(x => /neuložilo/.test(x.text)), d);
srv = await naServeru(soubor);
test('vedoucí: odemčení uložené — varianta neprodaná, zamčená, důvod v historii', !srv.varianty[0].prodano
  && !!srv.varianty[0].zamek.zamceno && (srv.prodejHistorie || []).some(h => h.akce === 'odemceno' && /odstoupil/.test(h.duvod)), srv.prodejHistorie);
o = await otevri(soubor);
test('vedoucí: po znovuotevření jde zase prodat (tlačítko Prodáno povolené)',
  await page.locator('#prodejKarta_ock button', { hasText: 'Prodáno' }).first().isEnabled());

await prohlizec.close(); server.close();
if (chyby.length) { console.log('Chyby v konzoli:\n  ' + chyby.join('\n  ')); fail += chyby.length; }
console.log(`\n${ok} OK, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
