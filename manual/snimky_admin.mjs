/* Automatické pořízení snímků pro PŘÍRUČKU ADMINISTRÁTORA (M8, 27. 10. 2026).
 *
 * Sourozenec `manual/snimky_auto.mjs` (příručka obchodníka): týž sběrač
 * `manual/snimac.js`, tytéž serverové funkce nad paměťovým úložištěm,
 * týž zkušební ceník. Rozdíl je v tom, KDO fotí — tady administrátor,
 * protože příručka správce ukazuje záložky Nastavení, ceník a zálohy.
 * Skript je samostatný schválně: příručka obchodníka se přefocuje jinými
 * dávkami a změna tady ji nesmí rozbít (a naopak).
 *
 * ODKUD SE BEROU DATA
 * Nic se nečte z ostrého ani z testovacího webu:
 *   – PROSTREDI=test (sestav_admin.sh snímky z jiného prostředí zastaví),
 *   – ceník je ZKUŠEBNÍ ze src/zkusebni_cenik.js (vymyšlená čísla),
 *   – účty, zákazníci a zakázky mají jen vymyšlená jména s domluvenou
 *     předponou (Ukázková / Vzorová / Modelová / Zkušební / Příkladná),
 *   – hlavní správce je `spravce@priklad.cz` (ADMIN_EMAIL jen pro tenhle
 *     běh) a jeho jméno se přepíše na „Správce Ukázkový".
 *
 * Spuštění (nejdřív KNG_NEZVYSOVAT_VERZI=1 python3 build.py):
 *   NODE_PATH=$(npm root -g) node manual/snimky_admin.mjs <mimo-repo>/snimky_admin.json
 * Volitelně KNG_SNIMKY_TEXTY=<soubor> — vypíše texty vyfocených panelů
 * (pomůcka při psaní kapitol; také mimo repozitář).
 *
 * Výstup se NIKDY nezapisuje do repozitáře (rozhodnutí 17. 9. 2026).
 */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const KOREN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VYSTUP = process.argv[2];
const TEXTY = process.env.KNG_SNIMKY_TEXTY || '';
if (!VYSTUP) {
  console.error('Použití: node manual/snimky_admin.mjs <cesta/snimky_admin.json>');
  process.exit(2);
}
for (const p of [VYSTUP, TEXTY].filter(Boolean)) {
  if (path.resolve(p).startsWith(KOREN + path.sep)) {
    console.error('CHYBA: snímky se do repozitáře neukládají — zvolte cestu mimo ' + KOREN);
    process.exit(2);
  }
}
if (!existsSync(path.join(KOREN, 'dist/kalkulacka.html'))) {
  console.error('Chybí dist/kalkulacka.html — nejdřív: KNG_NEZVYSOVAT_VERZI=1 python3 build.py');
  process.exit(2);
}
if (TEXTY) writeFileSync(TEXTY, '');

/* ---------- prostředí serverových funkcí (jako snimky_auto.mjs) ---------- */
const SPRAVCE = { email: 'spravce@priklad.cz', heslo: 'Zkusebni.Heslo.123', jmeno: 'Správce Ukázkový' };
process.env.TAJEMSTVI_RELACE = 'zkusebni-tajemstvi-jen-pro-snimky-prirucky';
process.env.ADMIN_INIT_HESLO = SPRAVCE.heslo;
process.env.ADMIN_EMAIL = SPRAVCE.email;
process.env.PROSTREDI = 'test';
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
const FUNKCE = {};
const slozkaFunkci = path.join(KOREN, 'netlify/functions');
for (const f of readdirSync(slozkaFunkci).filter(f => f.endsWith('.mjs'))) {
  const m = await import(pathToFileURL(path.join(slozkaFunkci, f)).href);
  if (m.config && m.config.path && typeof m.default === 'function') FUNKCE[m.config.path] = m.default;
}

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) {
  console.error('Playwright není k dispozici. Spusťte s NODE_PATH=$(npm root -g).');
  process.exit(2);
}
const ZC = require(path.join(KOREN, 'src/zkusebni_cenik.js'));
/* Výřez sekce (jako v snimky_auto.mjs): dočasná kopie vybraných dětí
 * rodiče — snímek ukáže jen tu část dlouhého panelu, o které krok mluví. */
const POMOCNIK_JS = `
window.vyrezSekce = function (rodic, od, po) {
  if (typeof rodic === 'string') rodic = document.querySelector(rodic);
  if (!rodic) return null;
  var deti = [].slice.call(rodic.children);
  var i0 = deti.findIndex(function (d) { return new RegExp(od, 'i').test(d.textContent); });
  if (i0 < 0) return null;
  var i1 = po ? deti.findIndex(function (d, i) { return i > i0 && new RegExp(po, 'i').test(d.textContent); }) : -1;
  if (i1 < 0) i1 = deti.length;
  var obal = rodic.cloneNode(false);
  obal.removeAttribute('id');
  obal.setAttribute('data-mn-docasny', '');
  deti.slice(i0, i1).forEach(function (d) { obal.appendChild(d.cloneNode(true)); });
  rodic.parentNode.insertBefore(obal, rodic.nextSibling);
  return obal;
};`;
const SNIMAC_JS = readFileSync(path.join(KOREN, 'manual/snimac.js'), 'utf8') + '\n' + POMOCNIK_JS;

/* ---------- vymyšlené účty a zakázky ---------- */
const UCTY = [
  { email: 'obchodnik@priklad.cz', jmeno: 'Petr Vzorek', role: 'Obchodník', funkce: 'obchodník', telefon: '+420 000 000 001' },
  { email: 'vedouci@priklad.cz', jmeno: 'Eva Modelová', role: 'Vedoucí', funkce: 'vedoucí obchodu', telefon: '+420 000 000 002' },
  { email: 'spravce2@priklad.cz', jmeno: 'Marie Příkladná', role: 'Administrátor', funkce: 'správa ceníku', telefon: '+420 000 000 003' },
  { email: 'byvaly@priklad.cz', jmeno: 'Jan Ukázka', role: 'Obchodník', funkce: 'obchodník', telefon: '+420 000 000 004', vypnout: true },
];
const HESLO_UCTU = 'Vzorove.Heslo.123';
const ZAKAZKY = [
  { cislo: '2026 - OPR - CN - 9100', objednatel: 'Ukázková správa budov s.r.o.',
    nazevAkce: 'vestavba nové prosklené OCK výtahové šachty', kontakt: 'Jan Ukázka', adresa: 'Vzorová 12, Praha 4' },
  { cislo: '2026 - OPR - CN - 9101', objednatel: 'Vzorové bytové družstvo',
    nazevAkce: 'přístavba výtahu k fasádě bytového domu', kontakt: 'Eva Modelová', adresa: 'Modelová 7, Brno' },
];
const ZAKAZNICI = [
  { nazev: 'Ukázková správa budov s.r.o.', sidlo: 'Vzorová 12, 140 00 Praha 4', kontaktOsoba: 'Jan Ukázka' },
  { nazev: 'Vzorové bytové družstvo', sidlo: 'Modelová 7, 602 00 Brno', kontaktOsoba: 'Eva Modelová' },
];
const ZADANI = { typSachty: 'interiérová', zaskleni: 'na terče', typPortalu: 'zapuštěný',
  sirka: 1.6, hloubka: 1.8, zdvih: 12, prejezd: 3.2, prohluben: 1.2, roztec: 1.25,
  nastupiste: 5, rohoveSloupky: 4, cistyVstupMm: 900, sirkaRamuMm: 100 };

/* ---------- aplikace a most na serverové funkce ---------- */
const html = readFileSync(path.join(KOREN, 'dist/kalkulacka.html'));
const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const ADRESA = 'http://127.0.0.1:' + server.address().port;

const prohlizec = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await prohlizec.newContext({ viewport: { width: 1360, height: 900 } });
const page = await ctx.newPage();
const chyby = [];
page.on('pageerror', e => chyby.push(String(e)));

let cookieJar = '';
await ctx.route('**/api/**', async route => {
  const r = route.request();
  const url = new URL(r.url());
  const fn = FUNKCE[url.pathname];
  if (!fn) return route.fulfill({ status: 404, contentType: 'application/json', body: '{"ok":false}' });
  const init = { method: r.method(), headers: { cookie: cookieJar, 'content-type': 'application/json' } };
  if (r.method() !== 'GET' && r.method() !== 'HEAD') init.body = r.postData() || '';
  const odp = await fn(new Request(r.url(), init));
  const setc = odp.headers.get('set-cookie');
  if (setc) cookieJar = setc.split(';')[0];
  const telo = await odp.text();
  if (odp.status >= 400 && process.env.KNG_SNIMKY_LADENI) console.log('  API ' + url.pathname + ' ' + odp.status + ' ' + telo.slice(0, 300));
  route.fulfill({ status: odp.status, contentType: 'application/json; charset=utf-8', body: telo });
});

const krok = (t) => console.log('· ' + t);
const cekej = (ms) => page.waitForTimeout(ms);
/* Dialogy se odklepnou „ano" a heslo správce se dosadí samo (zásahy do účtů,
 * matice zobrazení a potvrzení chtějí heslo — B168). Na snímcích dialog není. */
const dlgStub = () => page.evaluate((heslo) => {
  window.__dlg = [];
  window.potvrd = (t) => { window.__dlg.push(String(t)); return Promise.resolve(true); };
  window.hlaska = (t) => { window.__dlg.push(String(t)); return Promise.resolve(); };
  window.dotaz = (t, v) => { window.__dlg.push(String(t)); return Promise.resolve(v == null ? '' : v); };
  window.volba = () => Promise.resolve('zahodit');
  window.dotazHeslo = () => Promise.resolve(heslo);
}, SPRAVCE.heslo);
const nacti = async () => {
  await page.goto(ADRESA);
  await page.waitForFunction(() => typeof window.render === 'function');
  await cekej(500);
  await dlgStub();
};
const prihlas = async (email, heslo) => {
  await page.fill('#onlineEmail', email);
  await page.fill('#onlineHeslo', heslo);
  await page.click('#prihlaseni-box >> text=Přihlásit');
  await page.waitForFunction((e) => { try { return !!ONLINE_STAV.ja && ONLINE_STAV.ja.email === e; }
    catch (x) { return false; } }, email, { timeout: 15000 });
  await cekej(600);
};
const odhlas = async () => {
  await page.evaluate(() => onlineOdhlas());
  await page.waitForFunction(() => { try { return ONLINE_STAV.ja === null; } catch (e) { return false; } });
};
const api = async (cesta, telo) => {
  const r = await page.evaluate(([c, t]) => onlineApi(c, t), [cesta, telo]);
  if (!r || r.ok === false) throw new Error('API ' + cesta + ' selhalo: ' + JSON.stringify(r).slice(0, 300));
  return r;
};

/* Adresa místního serveru a skutečné jméno účtu (kdyby ho server dosadil)
 * se na snímku nahradí vymyšleným. */
const ANON = "klon.innerHTML = klon.innerHTML.replace(/127\\.0\\.0\\.1:\\d+/g, 'testengscalc.netlify.app');";
const pozadovane = [];
const vezmi = async (id, cil, volby = {}) => {
  pozadovane.push(id);
  const vysl = await page.evaluate(([id, cil, volby]) => {
    const el = cil.fn ? (new Function('return (' + cil.fn + ')()'))() : document.querySelector(cil.sel);
    if (!el) return 'NENALEZENO';
    if (el.scrollIntoView) el.scrollIntoView();
    const v = { tema: volby.tema, popis: volby.popis };
    v.uprav = new Function('klon', 'S', volby.anon + (volby.uprav || ''));
    const r = SNIMAC.vezmi(id, el, v);
    document.querySelectorAll('[data-mn-docasny]').forEach(e => e.remove());
    window.__posledniText = (el.innerText || '').replace(/\n{3,}/g, '\n\n');
    return r;
  }, [id, typeof cil === 'function' ? { fn: cil.toString() } : { sel: cil },
      { tema: volby.tema, popis: volby.popis || '', uprav: volby.uprav || '', anon: ANON }]);
  console.log('  ' + (vysl === 'NENALEZENO' ? '✕ ' + id + ' — prvek nenalezen' : '✓ ' + vysl));
  if (TEXTY && vysl !== 'NENALEZENO')
    appendFileSync(TEXTY, '\n\n===== ' + id + ' =====\n' + await page.evaluate(() => window.__posledniText));
};
const KARTA = (h2re) => new Function('return (function () { var h = [].slice.call(document.querySelectorAll("h2, h3"))'
  + '.filter(function (x) { return x.offsetParent && ' + h2re + '.test(x.textContent); })[0];'
  + ' return h && h.closest(".card"); })()');
const PANEL = () => document.querySelector('#nastaveni-panel');
const panel = async (id) => {
  await page.evaluate((p) => { otevriNastaveni(); nastPanel(p); window.scrollTo(0, 0); }, id);
  await cekej(700);
};
const zalozka = async (tab) => { await page.evaluate(t => { prepniTab(t); render(); window.scrollTo(0, 0); }, tab); await cekej(400); };

/* ---------- 0) přihlašovací okno (hlavní správce, první přihlášení) ---------- */
await nacti();
await page.addScriptTag({ content: SNIMAC_JS });
await page.fill('#onlineEmail', SPRAVCE.email);
await page.fill('#onlineHeslo', 'xxxxxxxxxx');
await vezmi('a-prihlaseni', '#prihlaseni-box');
const ODLOZENE = [];
const odloz = async () => { ODLOZENE.push(...await page.evaluate(() => SNIMAC.snimky.splice(0))); };
await odloz();
await page.fill('#onlineEmail', '');
await page.fill('#onlineHeslo', '');

/* ---------- 1) příprava dat ---------- */
krok('první přihlášení hlavního správce (účet z ADMIN_INIT_HESLO)');
await prihlas(SPRAVCE.email, SPRAVCE.heslo);
await api('/api/uzivatele', { akce: 'profil', jmeno: SPRAVCE.jmeno, funkce: 'správce aplikace', telefon: '+420 000 000 000' });

krok('zveřejnění zkušebního ceníku (dvě verze, ať je co porovnat)');
const zverejniCenik = (zdrazeni, poznamka) => page.evaluate(async ([cenik, cenikProj, zdrazeni, poznamka]) => {
  if (zdrazeni !== 1) cenik.montazHodKc = Math.round(cenik.montazHodKc * zdrazeni);
  Object.assign(cenik, { atypZamecnikKc: 50000, atypRezervaZakladPct: 0.30,
    atypRezervaPriplatkyPct: 0.30, atypMontazPct: 0.30, atypProjekcePct: 0.30 });
  const slevy = JSON.parse(JSON.stringify(NAST.slevy || {}));
  delete slevy.ukazkove; delete slevy.prazdny;
  slevy.stropy = Object.assign({}, slevy.stropy || {}, { 'Obchodník': 0.05, 'Vedoucí': 0.15 });
  if (!(slevy.minMarze > 0)) slevy.minMarze = 0.10;
  cenik.kurzEurKc = 25; cenikProj.kurzEurKc = 25;
  const zahranicni = { ceny: { 'C.montazHodKc': Math.round((+cenik.montazHodKc || 800) * 1.2),
    'C.cestovniKc': 15000, 'C.prekladyKc': 8000 }, jenZahr: { 'C.prekladyKc': true } };
  const r = await onlineApi('/api/program', { cenik, cenikProj, slevy, zahranicni, poznamka });
  if (!r || r.ok === false) throw new Error('zveřejnění ceníku selhalo: ' + JSON.stringify(r).slice(0, 300));
}, [ZC.zkusebniCenik(), ZC.zkusebniCenikProj(), zdrazeni, poznamka]);
await zverejniCenik(1, 'zkušební ceník — první verze');

krok('firemní údaje (vymyšlené)');
await page.evaluate(async () => {
  const f = firmaDefault();
  delete f.ukazkove;
  f.nazev = 'Ukázková dodavatelská s.r.o.';
  f.ico = '12345679';
  f.dic = 'CZ12345679';
  f.email = 'info@priklad.cz';
  f.web = 'www.priklad.cz';
  f.telefon = '+420 000 000 000';
  await onlineApi('/api/firma', { udaje: f });
});

krok('účty: obchodník, vedoucí, druhý správce, vypnutý účet');
for (const u of UCTY) {
  await api('/api/uzivatele', { akce: 'zaloz', email: u.email, jmeno: u.jmeno, role: u.role,
    heslo: HESLO_UCTU, funkce: u.funkce, telefon: u.telefon, hesloSpravce: SPRAVCE.heslo });
  if (u.vypnout) {
    await api('/api/uzivatele', { akce: 'aktivni', email: u.email, aktivni: false, hesloSpravce: SPRAVCE.heslo });
    await api('/api/uzivatele', { akce: 'archiv', email: u.email, archiv: true, hesloSpravce: SPRAVCE.heslo });
  }
}
for (const z of ZAKAZNICI) await api('/api/zakaznici', { zakaznik: z });

krok('ukázkové zakázky');
for (const h of ZAKAZKY) {
  await page.evaluate(async ([h, z]) => {
    await novaZakazkaUI();
    for (const k of ['cislo', 'nazevAkce', 'objednatel', 'kontakt', 'adresa']) set('ZAK.' + k, h[k]);
    typSachtyPrepni(z.typSachty);
    Object.keys(z).filter(k => k !== 'typSachty').forEach(k => set('Z.' + k, z[k]));
    prepniTab('kalk'); render();
  }, [h, ZADANI]);
  const ok = await page.evaluate(() => onlineUloz());
  if (!ok) console.log('  ✕ zakázka se neuložila: ' + h.cislo);
}
krok('druhá verze ceníku (zdražená montáž) — rozpracované nabídky jsou podle starší');
await zverejniCenik(1.1, 'zkušební ceník — zdražená montáž');

/* Nové načtení: stránka si stáhne všechno ze serveru jako po ranním přihlášení. */
await odloz();
await odhlas();
await nacti();
await prihlas(SPRAVCE.email, SPRAVCE.heslo);
await page.addScriptTag({ content: SNIMAC_JS });
await page.evaluate(() => { try { listaPokracujUI(); } catch (e) { /* nic */ } });
await cekej(500);
const prostredi = await page.evaluate(() => ({
  trida: document.body.classList.contains('prostredi-test'), role: ONLINE_STAV.ja && ONLINE_STAV.ja.role }));
krok('prostředí: ' + JSON.stringify(prostredi));
if (!prostredi.trida) { console.error('CHYBA: stránka nemá třídu prostredi-test.'); process.exit(1); }

/* ---------- 2) hlavička a pruh testovacího prostředí ---------- */
krok('hlavička správce');
await zalozka('kalk');
await vezmi('a-hlavicka', 'header', { tema: 'test' });
await vezmi('a-prostredi-lista', '#prostrediLista', { tema: 'test' });

/* ---------- 3) Nastavení po záložkách ---------- */
const PANELY = await page.evaluate(() => nastPanelyViditelne().map(x => ({ id: x.id, nazev: x.nazev })));
krok('záložky Nastavení: ' + PANELY.map(x => x.nazev).join(', '));
await panel('obecne');
await vezmi('a-nast-zalozky', () => document.querySelector('#nastaveni-panel .nast-tabs'));
/* Krátké panely celé, dlouhé jen výřezem — celý panel Šablon nebo Zobrazení
 * má přes 3 000 px a v tisku by zabral několik stran. */
const CELE = ['obecne', 'slevy', 'standard', 'konfigurace', 'slovnik', 'analytika', 'pdmapa'];
for (const p of PANELY.filter(x => CELE.includes(x.id))) {
  krok('Nastavení → ' + p.nazev);
  await panel(p.id);
  await vezmi('a-nast-' + p.id, () => document.querySelector('#nastaveni-panel'));
}
const BODY = '#nastaveni-panel .body';
const vyrez = (od, po) => new Function('return vyrezSekce(' + JSON.stringify(BODY) + ', '
  + JSON.stringify(od) + ', ' + JSON.stringify(po || '') + ')');
krok('Nastavení → Firma (výřezy)');
await panel('firma');
await vezmi('a-firma-identifikace', vyrez('^\\s*Identifikace', '^\\s*Korespondenční'));
await vezmi('a-firma-online', vyrez('Firemní údaje v online databázi', '^\\s*Zavřít\\s*$'));
krok('Nastavení → Smlouvy / Šablony (výřezy)');
await panel('sablony');
await vezmi('a-sablony-dokumenty', vyrez('Šablony dokumentů', '^\\s*Zavřít\\s*$'));
await vezmi('a-sablony-podminky', vyrez('Platební podmínky OCK', 'Věty platebního kalendáře'));
krok('Nastavení → Controlling (výřez)');
await panel('controlling');
await vezmi('a-nast-controlling', () => document.querySelector('#nastaveni-panel'), { uprav:
  "[].slice.call(klon.querySelectorAll('table')).forEach(function (t) { [].slice.call(t.querySelectorAll('tr')).slice(6).forEach(function (r) { r.remove(); }); });" });

/* Uživatelé: tabulka účtů, reset hesla, nový účet. */
krok('Uživatelé: tabulka, reset hesla, nový účet');
await panel('uzivatele');
const TAB_UCTU = () => [...document.querySelectorAll('#nastaveni-panel table')].find(x => /Petr Vzorek/.test(x.textContent));
await vezmi('a-uz-tabulka', TAB_UCTU);
await page.evaluate(() => onlineUzHesloPanel('obchodnik@priklad.cz'));
await cekej(400);
await page.fill('#onlineUzNoveHeslo', 'xxxxxxxxxx').catch(() => {});
await vezmi('a-uz-reset', TAB_UCTU);
await page.evaluate(() => onlineUzHesloPanel(''));
await page.evaluate(() => {
  Object.assign(ONLINE_STAV.uzForm, { email: 'nova.kolegyne@priklad.cz', titul: 'Ing.', jmeno: 'Alena Vzorová',
    funkce: 'obchodní technik', telefon: '+420 000 000 005', role: 'Obchodník', heslo: 'xxxxxxxxxx' });
  onlineUzivateleObnov();
});
await cekej(400);
await vezmi('a-uz-novy', () => {
  const i = document.querySelector('#onlineUzEmail');
  return i && vyrezSekce(i.closest('.row').parentElement, 'Založit nový účet', 'Archivovat…');
});
await page.evaluate(() => { Object.assign(ONLINE_STAV.uzForm, { email: '', titul: '', jmeno: '', funkce: '', telefon: '', heslo: '' }); });

/* Zobrazení: náhled pohledem uživatele a začátek matice (první tabulka,
 * pár řádků) — celá matice má přes 5 000 px. */
krok('Zobrazení: výřez matice');
await panel('zobrazeni');
await vezmi('a-zobr-matice', () => document.querySelector('#nastaveni-panel .body'), { uprav:
  "var t = [].slice.call(klon.querySelectorAll('table')); t.slice(1).forEach(function (x) { x.remove(); });"
  + " if (t[0]) [].slice.call(t[0].querySelectorAll('tr')).slice(5).forEach(function (r) { r.remove(); });"
  + " [].slice.call(klon.querySelectorAll('h3, h4, .zobr-skupina')).forEach(function (h, i) { if (i > 1) h.remove(); });"
  + " var b = klon.querySelector('.btns'); if (b) b.remove();" });

/* Databáze: noční otisk (plánovaná funkce zaloha_nocni zavolaná přímo,
 * jako by ji pustil Netlify), vynucená záloha, přehled, obnova. */
krok('Databáze: noční otisk a Zálohovat teď');
const nocni = await import(pathToFileURL(path.join(KOREN, 'netlify/functions/zaloha_nocni.mjs')).href);
for (let i = 0; i < 6; i++) {
  const o = await nocni.default(new Request('http://127.0.0.1/.netlify/functions/zaloha_nocni', { method: 'POST' }));
  const t = await o.text();
  if (process.env.KNG_SNIMKY_LADENI) console.log('  zaloha_nocni: ' + t.slice(0, 200));
  if (!/rozpracov/.test(t)) break;
}
/* Vynucená záloha má odstup 10 minut a jedna vznikla při přihlášení —
 * serverovým funkcím (běží tady v Node) se posunou hodiny. */
const datumNyni = Date.now;
Date.now = () => datumNyni() + 11 * 60 * 1000;
await panel('databaze');
await page.evaluate(() => onlineZalohaTed());
await cekej(2500);
Date.now = datumNyni;
await page.evaluate(() => onlineOtiskyNacti().then(() => render()));
await cekej(800);
await vezmi('a-db-karta', KARTA('/Online databáze/i'));
await vezmi('a-db-prenos', KARTA('/Přenos ceníku/i'));
await vezmi('a-db-ukazkove', KARTA('/Ukázkové zakázky/i'));

/* Pojistka úbytku: varování, které server pošle po noční záloze s méně
 * daty. Úbytek se tady nesimuluje na serveru — do stavu stránky se vloží
 * záznam stejného tvaru, jaký vrací /api/zaloha_vynuceno, a karta ho
 * vykreslí svou vlastní cestou (uloRetenceVarovani). */
krok('Databáze: pojistka úbytku dat (ukázkový záznam)');
await page.evaluate(() => {
  const vcera = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dnes = new Date().toISOString().slice(0, 10);
  ONLINE_STAV.retenceVarovani = { den: dnes, predchozi: vcera, kdy: new Date().toISOString(),
    pred: { pocetZakazek: 812, pocetUctu: 9 }, nove: { pocetZakazek: 640, pocetUctu: 9 } };
  render();
});
await cekej(300);
await vezmi('a-db-retence', () => document.querySelector('#online-retence-varovani'));
await page.evaluate(() => { ONLINE_STAV.retenceVarovani = null; render(); });

krok('Databáze: obnova ze zálohy (náhled)');
await page.evaluate(() => onlineObnovaOtevri());
await cekej(1500);
const OBNOVA = () => {
  const b = [...document.querySelectorAll('#nastaveni-panel button')].find(x => /Zobrazit náhled|Obnovit databázi/.test(x.textContent));
  let e = b;
  while (e && e.parentElement && !/Opak zálohy/.test(e.textContent)) e = e.parentElement;
  return e;
};
await vezmi('a-db-obnova', OBNOVA);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('#nastaveni-panel button')].find(x => /Zobrazit náhled/.test(x.textContent));
  if (b) b.click();
});
await cekej(3000);
await vezmi('a-db-obnova-nahled', OBNOVA);
await page.evaluate(() => { zavriNastaveni(); });

/* ---------- 4) ceník ---------- */
krok('Ceník nákladů OCK');
await zalozka('cenik');
await vezmi('a-cenik-platny', KARTA('/Platný ceník programu/i'));
await vezmi('a-cenik-tabulka', KARTA('/Ceník nákladů OCK/i'), { uprav:
  "var t = klon.querySelector('table'); if (t) [].slice.call(t.querySelectorAll('tr')).slice(13).forEach(function (r) { r.remove(); });"
  + " var tt = [].slice.call(klon.querySelectorAll('table')); tt.slice(1).forEach(function (x) { x.remove(); });" });
await page.evaluate(() => otevriProgram());
await cekej(800);
await vezmi('a-cenik-verze', '#program-panel');
await page.evaluate(() => zavriProgram());
await zalozka('cenikproj');
await vezmi('a-cenikproj', () => [...document.querySelectorAll('#page-cenikproj .card')].find(c => c.querySelector('table')), { uprav:
  "var t = klon.querySelector('table'); if (t) [].slice.call(t.querySelectorAll('tr')).slice(10).forEach(function (r) { r.remove(); });"
  + " var tt = [].slice.call(klon.querySelectorAll('table')); tt.slice(1).forEach(function (x) { x.remove(); });" });

/* ---------- 5) schvalování slev a přehled nabídek ---------- */
krok('Přehled cenových nabídek a schvalování');
await zalozka('schvalovani');
await vezmi('a-schvalovani', '#page-schvalovani');

/* ---------- 6) náhled pohledem uživatele (menu pod jménem) ---------- */
krok('náhled pohledem uživatele');
await zalozka('kalk');
await page.evaluate(() => nahledMenuPrepni());
await cekej(800);
/* Nabídka visí absolutně pod jménem — ve snímku stojí v toku stránky. */
await vezmi('a-nahled-menu', () => document.querySelector('.nahled-menu'), { uprav:
  "klon.style.position = 'static'; klon.style.right = 'auto'; klon.style.top = 'auto';" });
await page.evaluate(() => { if (NAST.nahledMenu) nahledMenuPrepni(); });

/* ---------- odevzdání ---------- */
const data = await page.evaluate(() => SNIMAC.data());
data.snimky.push(...ODLOZENE.filter(o => !data.snimky.some(s => s.id === o.id)));
writeFileSync(VYSTUP, JSON.stringify(data));
const mame = new Set(data.snimky.map(s => s.id));
const chybi = pozadovane.filter(id => !mame.has(id));
console.log('\nZapsáno: ' + VYSTUP + ' (' + Math.round(JSON.stringify(data).length / 1024) + ' kB)');
console.log('verze: ' + data.verze + ', prostředí: ' + data.prostredi + ', snímků: ' + data.snimky.length);
if (chybi.length) console.log('CHYBÍ: ' + chybi.join(', '));
if (chyby.length) console.log('Chyby stránky:\n  ' + chyby.join('\n  '));
await prohlizec.close();
server.close();
process.exit(chybi.length ? 1 : 0);
