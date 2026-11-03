/* ZO #555 — TISK KLONU ODESLANÉ NABÍDKY V PROHLÍŽEČI, celý tok.
 *
 * Hlášení J. V. 3. 11. 2026 (test v2.11.9): klon odeslané nabídky
 * (varianta 2) → Kompletní náhled a tisk nabídky → dokument se vytiskl, ale
 * vyskočilo „Odeslaná nabídka není uložená … (Neuloženo: změnila by se data
 * uzamčené (odeslané) nabídky. Pokračujte klonem varianty.)".
 *
 * Příčina: na odeslané variantě je výběr „Typ šachty" aktivní. `set()` změnu
 * typu odmítne a jen nabídne klon (dialog doběhne později), jenže
 * typSachtyPrepni pak dosadil výchozí profily nového typu PŘÍMO do zadání
 * odeslané varianty. Klon vznikl už ze změněných dat a první uložení —
 * to po tisku klonu — server odmítl. Data odeslané nabídky v databázi
 * zůstala celá; klon a jeho zámek se neuložily.
 *
 * Harness: skutečný klient proti skutečným serverovým funkcím (most jako
 * v overit_online.mjs, paměťové úložiště). Ověřuje:
 *   1) tok J. V.: typ šachty na odeslané variantě → Založit klon → typ
 *      v klonu → tisk klonu → uloženo, bez dialogu, data odeslané varianty
 *      beze změny v prohlížeči i na serveru, klon zamčený na serveru;
 *   1b) Prodáno na vytištěném klonu se uloží (doplnění J. V. 3. 11. — dřív
 *      „Prodej se neuložil: Neuloženo: změnila by se data uzamčené …");
 *   1c) tisk klonu, jehož uložení selhalo (výpadek sítě): po obnovení sítě
 *      Prodáno uloží klon i se zámkem z tisku a prodej — bez hlášky o změně
 *      dat zamčené varianty;
 *   2) „Nechat beze změny" nezmění nic (ani profily);
 *   3) diagnostika: když se data zamčené varianty přesto liší, dialog po
 *      tisku řekne kterou variantu a první rozdílnou cestu, bez hodnot;
 *   4) žádný vstup na žádné záložce nezmění data odeslané varianty
 *      (hlídač zápisů — Proxy nad daty zamčené varianty).
 *
 * Pojistka: nad 6e4bf49 (v3.11.1) selže 1) i 2) i 3) a 4) (viz commit).
 * Smyšlené účty a údaje, zkušební ceník.
 * Spuštění: NODE_PATH=$(npm root -g) node overit_klon_tisk.mjs */
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
catch (e) { console.error('Playwright není k dispozici. NODE_PATH=$(npm root -g) node overit_klon_tisk.mjs'); process.exit(2); }

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
  const rp = await (await post(program, 'http://x/api/program', { cenik: ceniky.ock, cenikProj: ceniky.proj, poznamka: 'ZO #555 (harness)' }, cA)).json();
  if (!rp.ok) throw new Error('program ' + JSON.stringify(rp));
  for (const [email, role] of [['obch.klon@priklad.cz', 'Obchodník'], ['cizi.klon@priklad.cz', 'Obchodník'], ['ved.klon@priklad.cz', 'Vedoucí']]) {
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
page.on('console', m => { if (m.type() === 'error' && !/status of (401|403|400|409)|net::ERR_FAILED/.test(m.text())) chyby.push('console: ' + m.text()); }); // net::ERR_FAILED = simulovaný výpadek sítě (1c)
page.on('pageerror', e => chyby.push('pageerror: ' + e.message));

let cookieJar = '';
await page.route('**/api/**', async route => {
  const r = route.request();
  if (global.__vypadek && r.method() === 'POST' && new URL(r.url()).pathname === '/api/zakazky') return route.abort('failed');
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

/* Dialogy: harness si zapamatuje každý text i nadpis. „Uzamčená varianta"
 * odpoví podle window.__klonAno (Založit klon / Nechat beze změny), „Ze
 * které varianty generovat?" otevřenou variantou (klonem). */
await page.evaluate(() => {
  window.__dlg = [];
  window.__klonAno = true;
  window.potvrd = (t, o) => { const nadpis = (o && o.nadpis) || ''; window.__dlg.push({ druh: 'potvrd', nadpis, text: String(t) });
    if (nadpis === 'Uzamčená varianta') return Promise.resolve(!!window.__klonAno);
    return Promise.resolve(true); };   // „Ze které varianty generovat?" → otevřená (klon)
  window.hlaska = (t, o) => { window.__dlg.push({ druh: 'hlaska', nadpis: (o && o.nadpis) || '', text: String(t) }); return Promise.resolve(); };
  /* Přepnutí zakázky s „neuloženými změnami" (po odhlášení / odmítnutém prodeji): zahodit. */
  window.volba = (t) => { window.__dlg.push({ druh: 'volba', text: String(t) }); return Promise.resolve('zahodit'); };
  window.dotaz = (t, v) => { window.__dlg.push({ druh: 'dotaz', text: String(t) }); return Promise.resolve('Zákazník odstoupil od objednávky'); };
});
const dlg = () => page.evaluate(() => window.__dlg.splice(0));

const prihlas = (email) => page.evaluate(async (email) => {
  if (ONLINE_STAV.ja) await onlineOdhlas();
  ONLINE_STAV.formEmail = email; ONLINE_STAV.formHeslo = email === 'spravce@priklad.cz' ? 'Zkusebni.Heslo.123' : 'Heslo12345x';
  await onlinePrihlas();
  return ONLINE_STAV.ja && ONLINE_STAV.ja.email;
}, email);

const naServeru = async (soubor) => {
  const rA = await post(prihlaseni, 'http://x/api/prihlaseni', { email: process.env.ADMIN_EMAIL, heslo: 'Zkusebni.Heslo.123' });
  const cA = (rA.headers.get('set-cookie') || '').split(';')[0];
  return (await (await zakazky(new Request('http://x/api/zakazky?soubor=' + encodeURIComponent(soubor), { headers: { cookie: cA } }))).json()).zakazka;
};
const rozdil = (a, b, p = '') => { if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const r = rozdil(a[k], b[k], p + '.' + k); if (r) return r; } }
  return p || '(kořen)'; };
const cekej = async () => { await page.waitForFunction(() => !ONLINE_STAV.ukladaBeh && !ZAKULO_STAV.uklada, null, { timeout: 15000 }); await page.waitForTimeout(300); };
const dataV = (i) => page.evaluate((i) => JSON.parse(JSON.stringify(ZAK.varianty[i].data)), i);
const neulozena = (d) => d.filter(x => /není uložená|neuložila|změnila by se data/.test(x.text + ' ' + (x.nadpis || '')));
const TABY = ['kalk', 'detail', 'spec', 'specdata', 'kryci', 'proj', 'detailproj', 'kryciproj', 'cenik', 'cenikproj', 'zakazka'];
const typSelect = 'select[onchange^="typSachtyPrepni"]';
/* Tisk z náhledu: okno náhledu zamyká přes window.opener.zamekPoTisku
 * (tiskListaSkript) — harness zavolá totéž po otevření náhledu. */
const tiskniKlon = async () => {
  await page.evaluate(() => prepniTab('zakazka'));
  await page.evaluate(async () => { await nabidkaOckDokument(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => zamekPoTisku('nabidkaTisk', aktivniVarianta(ZAK).id));
  await page.waitForTimeout(300);
  await cekej();
};
page.on('popup', p => { p.on('pageerror', e => chyby.push('popup: ' + e.message)); });

test('obchodník přihlášen', await prihlas('obch.klon@priklad.cz') === 'obch.klon@priklad.cz');
/* Odeslaná nabídka (exteriérová šachta), uložená a vytištěná. */
const odeslana = (cislo) => page.evaluate(async ([ceniky, cislo]) => {
  zakOdpojUlozeni();
  ZAK = novaZakazka(); ZAK.cislo = '2026 - OPR - CN - ' + cislo; ZAK.nazevAkce = 'TEST Klon tisk ' + cislo;
  const v = aktivniVarianta(ZAK);
  v.data.cenik = ceniky.ock; v.data.proj.cenik = ceniky.proj;
  Object.assign(v.data.ock.zadani, { sirka: 1.6, hloubka: 1.8, zdvih: 9, prejezd: 3.2, prohluben: 1.2, typSachty: 'exteriérová' });
  v.data.ock.zadani.profily = JSON.parse(JSON.stringify(PROFILY_VYCHOZI['exteriérová']));
  syncVarianta(); render();
  await onlineUloz();
  zamekPoTisku('nabidkaTisk', aktivniVarianta(ZAK).id);
  await (ONLINE_STAV.ukladaBeh || Promise.resolve());
  return ONLINE_STAV.soubor;
}, [ceniky, cislo]);
const otevri = async (s) => { await page.evaluate(async (s) => { await onlineOtevri(s); prepniTab('kalk'); render(); }, s); await dlg(); };

/* ---- 1) tok J. V. ---- */
const soubor = await odeslana('8741');
await cekej();
let srv = await naServeru(soubor);
test('příprava: nabídka uložená a vytištěná (zámek na serveru)', !!soubor && !!(srv.varianty[0].zamek || {}).zamceno, soubor);
const v1Server = JSON.stringify(srv.varianty[0].data);
await otevri(soubor);
const v1Pred = await dataV(0);
const profilyInt = await page.evaluate(() => JSON.stringify(PROFILY_VYCHOZI['interiérová']));
test('(výchozí profily obou typů se liší — jinak by test nic neověřil)',
  profilyInt !== JSON.stringify(v1Pred.ock.zadani.profily));
await page.evaluate(() => { window.__klonAno = true; });
await page.selectOption(typSelect, 'interiérová');   // odeslaná varianta → dialog → Založit klon
await page.waitForTimeout(400);
let d = await dlg();
test('změna typu na odeslané variantě nabídne klon („Uzamčená varianta")', d.some(x => x.nadpis === 'Uzamčená varianta'), d);
let st = await page.evaluate(() => ({ n: ZAK.varianty.length, akt: ZAK.varianty.findIndex(v => v.id === ZAK.aktivni) }));
test('klon vznikl a je otevřený', st.n === 2 && st.akt === 1, st);
let v1 = await dataV(0);
test('#555: odeslaná varianta po nabídce klonu beze změny (profily nedosazeny)', !rozdil(v1Pred, v1), rozdil(v1Pred, v1));
const klonPred = await dataV(1);
test('#555: klon vznikl z nezměněných dat odeslané varianty', JSON.stringify(klonPred.ock.zadani) === JSON.stringify(v1Pred.ock.zadani),
  rozdil(v1Pred.ock.zadani, klonPred.ock.zadani));
/* V klonu typ šachty změnit znovu (hodnotu zablokovanou zámkem uživatel zadá znovu). */
await page.selectOption(typSelect, 'interiérová');
await page.waitForTimeout(300);
const klon = await dataV(1);
test('v klonu se typ změní a dosadí se výchozí profily interiérové šachty',
  klon.ock.zadani.typSachty === 'interiérová' && JSON.stringify(klon.ock.zadani.profily) === profilyInt, klon.ock.zadani.typSachty);
await dlg();
await tiskniKlon();
d = await dlg();
test('#555: tisk klonu bez dialogu „Odeslaná nabídka není uložená"', !neulozena(d).length, neulozena(d));
v1 = await dataV(0);
test('#555: data odeslané varianty po tisku klonu beze změny (prohlížeč)', !rozdil(v1Pred, v1), rozdil(v1Pred, v1));
srv = await naServeru(soubor);
test('#555: klon uložen na serveru a zamčený (záznam odeslání)', srv.varianty.length === 2 && !!(srv.varianty[1].zamek || {}).zamceno,
  srv.varianty.map(v => !!(v.zamek && v.zamek.zamceno)));
test('#555: odeslaná varianta na serveru beze změny', JSON.stringify(srv.varianty[0].data) === v1Server);

/* ---- 1b) Prodáno na klonu (doplnění J. V. 3. 11.: „Prodej se neuložil:
 * Neuloženo: změnila by se data uzamčené (odeslané) nabídky") ---- */
const klikniProdano = async () => {
  await page.evaluate(() => { prepniTab('kryci'); render(); });
  await page.locator('#prodejKarta_ock button', { hasText: 'Prodáno' }).first().click();
  await page.waitForTimeout(300);
  await cekej();
};
await dlg();
await klikniProdano();
d = await dlg();
test('#555: Prodáno na vytištěném klonu — bez „Prodej se neuložil"', !d.some(x => /Prodej se neuložil/.test(x.text)), d);
srv = await naServeru(soubor);
test('#555: klon je na serveru prodaný, odeslaná varianta 1 beze změny',
  !!(srv.varianty[1] && srv.varianty[1].prodano) && !srv.varianty[0].prodano && JSON.stringify(srv.varianty[0].data) === v1Server,
  srv.varianty.map(v => !!v.prodano));

/* ---- 1c) tisk klonu se neuložil (výpadek sítě) → Prodáno → uložení ---- */
const soubor4 = await odeslana('8744');
await cekej();
await otevri(soubor4);
const u1Pred = await dataV(0);
await page.evaluate(() => { window.__klonAno = true; });
await page.selectOption(typSelect, 'interiérová');   // klon jako J. V.
await page.waitForTimeout(400);
await page.selectOption(typSelect, 'interiérová');   // typ v klonu
await page.waitForTimeout(300);
await cekej(); await dlg();
global.__vypadek = true;
await tiskniKlon();
d = await dlg();
test('výpadek: tisk klonu se neuložil — dialog s důvodem „server je teď nedostupný"',
  neulozena(d).some(x => /\n\nDůvod: server je teď nedostupný/.test(x.text)), d);
global.__vypadek = false;
await klikniProdano();
d = await dlg();
const prodText = (d.find(x => /Prodej se neuložil/.test(x.text)) || {}).text || '';
test('#555: Prodáno po neuloženém tisku klonu (síť zpět) nehlásí „změnila by se data uzamčené"', !/změnila by se data/.test(prodText), d);
const srv4 = await naServeru(soubor4);
test('#555: …uloží se klon i se zámkem z tisku a je prodaný', srv4.varianty.length === 2
  && !!(srv4.varianty[1].zamek || {}).zamceno && !!srv4.varianty[1].prodano && !srv4.varianty[0].prodano,
  srv4.varianty.map(v => [!!(v.zamek && v.zamek.zamceno), !!v.prodano]));
test('#555: odeslaná varianta 1 (8744) beze změny v okně', !rozdil(u1Pred, await dataV(0)), rozdil(u1Pred, await dataV(0)));

/* ---- 2) „Nechat beze změny" ---- */
const soubor2 = await odeslana('8742');
await cekej();
await otevri(soubor2);
const w1 = await dataV(0);
await page.evaluate(() => { window.__klonAno = false; });
await page.selectOption(typSelect, 'interiérová');
await page.waitForTimeout(400);
d = await dlg();
const w2 = await dataV(0);
test('„Nechat beze změny": dialog se ukázal, klon nevznikl', d.some(x => x.nadpis === 'Uzamčená varianta')
  && await page.evaluate(() => ZAK.varianty.length) === 1, d);
test('#555: „Nechat beze změny": data odeslané varianty beze změny (ani profily)', !rozdil(w1, w2), rozdil(w1, w2));
test('…a výběr typu ukazuje dál exteriérovou', await page.locator(typSelect).inputValue() === 'exteriérová');

/* ---- 3) diagnostika hlášky ---- */
const soubor3 = await odeslana('8743');
await cekej();
await otevri(soubor3);
await page.evaluate(() => { window.__klonAno = true; zamekKlonUI(ZAK.varianty[0].id); });
await cekej(); await dlg();
/* Simulace jiné (dosud neznámé) cesty, která by data odeslané varianty změnila. */
await page.evaluate(() => { ZAK.varianty[0].data.ock.zadani.zdvih = 12.5; });
await tiskniKlon();
d = await dlg();
const dg = neulozena(d)[0];
const dgText = dg ? dg.text : '';
test('diagnostika: po tisku dialog „Odeslaná nabídka není uložená"', !!dg && dg.nadpis === 'Odeslaná nabídka není uložená', d);
test('#555: dialog jmenuje zamčenou variantu (název a číslo)', /„Varianta 1" \(2026 - OPR - CN - 8743\)/.test(dgText), dgText);
test('#555: dialog uvádí první rozdílnou cestu v datech', /první rozdíl v datech: ock\.zadani\.zdvih/.test(dgText), dgText);
test('#555: dialog nenese hodnoty (12.5 ani 9)', !/12[.,]5|\b9\b/.test(dgText.replace(/2026 - OPR - CN - 8743/, '')), dgText);
test('#555: důvod je v dialogu na vlastním řádku', /\n\nDůvod: Neuloženo: změnila by se data uzamčené/.test(dgText), dgText);

await otevri(soubor2);
await page.evaluate(() => { window.__klonAno = false; });
/* ---- 4) žádný vstup nezapíše do odeslané varianty (hlídač zápisů) ----
 * Každý viditelný vstup na každé záložce nad odeslanou variantou (dialog
 * klonu „Nechat beze změny"). Porušení = změna dat podle téhož pravidla,
 * jakým porovnává server (zamekDataPorovnani — volná pole krycího listu
 * a DPH po CN se doplňovat smějí); Proxy řekne, kdo kam zapsal. */
await page.evaluate(() => {
  window.__zapisy = [];
  const obal = (o, cesta) => (o && typeof o === 'object') ? new Proxy(o, {
    get(t, k) { const x = t[k]; return (x && typeof x === 'object' && typeof k === 'string') ? obal(x, cesta + '.' + k) : x; },
    set(t, k, h) { if (JSON.stringify(t[k]) !== JSON.stringify(h)) window.__zapisy.push(cesta + '.' + String(k)); t[k] = h; return true; },
    deleteProperty(t, k) { if (k in t) window.__zapisy.push('smazáno ' + cesta + '.' + String(k)); delete t[k]; return true; },
  }) : o;
  const v = ZAK.varianty[0];
  v.data = obal(v.data, 'data');
  window.__zakl = zamekDataPorovnani(JSON.parse(JSON.stringify(v.data)), v);
  syncVarianta(); render();
});
const zapisy = [];
for (const t of TABY) {
  await page.evaluate((t) => prepniTab(t), t);
  await page.waitForTimeout(100);
  const n = await page.evaluate(() => document.querySelectorAll('input, select, textarea').length);
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate(([i, t]) => {
      const el = document.querySelectorAll('input, select, textarea')[i];
      if (!el || el.disabled || el.readOnly || el.offsetParent === null) return null;
      if (/^(file|button|password|submit)$/.test(el.type)) return null;
      if (/heslo|email|online|soubor|hled|filtr/i.test((el.id || '') + (el.name || '') + (el.className || ''))) return null;
      if (/varAktivuj/.test(el.getAttribute('onchange') || '')) return null;
      if (ZAK.varianty.length !== 1 || ZAK.aktivni !== ZAK.varianty[0].id) return 'jiná varianta';
      const pred = window.__zapisy.length;
      const v = ZAK.varianty[0];
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !el.checked;
      else if (el.tagName === 'SELECT') { if (el.options.length > 1) el.selectedIndex = (el.selectedIndex + 1) % el.options.length; }
      else if (el.type === 'number') el.value = String((+el.value || 0) + 1);
      else if (el.type === 'date') el.value = '2026-11-02';
      else el.value = (el.value || '') + 'x';
      for (const e of ['input', 'change', 'blur']) el.dispatchEvent(new Event(e, { bubbles: true }));
      const ted = zamekDataPorovnani(JSON.parse(JSON.stringify(v.data)), v);
      if (ted === window.__zakl) return null;
      window.__zakl = ted;
      return t + ': ' + (el.getAttribute('onchange') || el.getAttribute('oninput') || el.id || el.tagName).slice(0, 80)
        + ' → ' + window.__zapisy.slice(pred).join(', ');
    }, [i, t]);
    if (r) zapisy.push(r);
  }
}
await dlg();
test('#555: žádný vstup na žádné záložce nezapíše do dat odeslané varianty', !zapisy.length, zapisy.slice(0, 5));

test('bez chyb stránky', !chyby.length, chyby);
console.log(`\n${ok} OK, ${fail} FAIL`);
await prohlizec.close(); server.close();
process.exit(fail ? 1 : 0);
